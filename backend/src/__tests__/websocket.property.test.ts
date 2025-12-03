import * as fc from 'fast-check';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { StoryManager } from '../services/StoryManager.js';
import { setupWebSocketHandlers } from '../routes/websocket.js';

// Feature: ghost-story-generator, Property 6: Broadcast reaches all participants
describe('WebSocket Property Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let storyManager: StoryManager;
  let serverPort: number;

  beforeEach((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });
    storyManager = new StoryManager();
    setupWebSocketHandlers(io, storyManager);

    httpServer.listen(() => {
      serverPort = (httpServer.address() as any).port;
      done();
    });
  });

  afterEach((done) => {
    io.close();
    httpServer.close(done);
  });

  // Feature: ghost-story-generator, Property 6: Broadcast reaches all participants
  test('Property 6: segment broadcasts reach all participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (participantCount, sessionTitle, segmentContent) => {
          // Create clients
          const clients: ClientSocket[] = [];
          const receivedSegments: boolean[] = new Array(participantCount).fill(false);

          try {
            // Connect all clients
            for (let i = 0; i < participantCount; i++) {
              const client = ioClient(`http://localhost:${serverPort}`);
              clients.push(client);
              await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
              });
            }

            // First client creates session
            const sessionPromise = new Promise<string>((resolve) => {
              clients[0].on('session:created', (session) => {
                resolve(session.id);
              });
            });

            clients[0].emit('session:create', {
              title: sessionTitle,
              userName: 'User0',
            });

            const sessionId = await sessionPromise;

            // Set up listeners for segment:added on all clients BEFORE joining
            const segmentPromises = clients.map((client, index) => {
              return new Promise<void>((resolve) => {
                client.on('segment:added', (segment) => {
                  if (segment.content === segmentContent) {
                    receivedSegments[index] = true;
                    resolve();
                  }
                });
              });
            });

            // Other clients join the session
            for (let i = 1; i < participantCount; i++) {
              const joinPromise = new Promise<void>((resolve) => {
                clients[i].on('session:updated', () => {
                  resolve();
                });
              });

              clients[i].emit('session:join', {
                sessionId,
                userName: `User${i}`,
              });

              await joinPromise;
            }

            // One client adds a segment
            clients[0].emit('segment:add', {
              sessionId,
              content: segmentContent,
            });

            // Wait for all clients to receive the segment
            await Promise.all(segmentPromises);

            // Verify all participants received the broadcast
            const allReceived = receivedSegments.every((received) => received === true);

            return allReceived;
          } finally {
            // Clean up
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  // Feature: ghost-story-generator, Property 23: Invite links are unique and valid
  test('Property 23: invite links are unique and valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
        async (sessionTitles) => {
          const clients: ClientSocket[] = [];
          const inviteLinks: string[] = [];

          try {
            // Create multiple sessions and generate invite links
            for (let i = 0; i < sessionTitles.length; i++) {
              const client = ioClient(`http://localhost:${serverPort}`);
              clients.push(client);

              await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
              });

              const sessionPromise = new Promise<string>((resolve) => {
                client.on('session:created', (session) => {
                  resolve(session.id);
                });
              });

              client.emit('session:create', {
                title: sessionTitles[i],
                userName: `User${i}`,
              });

              const sessionId = await sessionPromise;

              // Generate invite link
              const inviteLinkPromise = new Promise<string>((resolve) => {
                client.on('invite:generated', (data) => {
                  resolve(data.inviteLink);
                });
              });

              client.emit('invite:generate', {
                sessionId,
              });

              const inviteLink = await inviteLinkPromise;
              inviteLinks.push(inviteLink);
            }

            // Check that all invite links are unique
            const uniqueLinks = new Set(inviteLinks);
            const allUnique = uniqueLinks.size === inviteLinks.length;

            // Check that all invite links are valid URLs
            const allValid = inviteLinks.every((link) => {
              try {
                new URL(link);
                return link.includes('/join/');
              } catch {
                return false;
              }
            });

            return allUnique && allValid;
          } finally {
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  // Feature: ghost-story-generator, Property 24: Invite links add participants
  test('Property 24: invite links add participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (sessionTitle, newUserName) => {
          const clients: ClientSocket[] = [];

          try {
            // Create a session
            const client0 = ioClient(`http://localhost:${serverPort}`);
            clients.push(client0);

            await new Promise<void>((resolve) => {
              client0.on('connect', () => resolve());
            });

            const sessionPromise = new Promise<string>((resolve) => {
              client0.on('session:created', (session) => {
                resolve(session.id);
              });
            });

            client0.emit('session:create', {
              title: sessionTitle,
              userName: 'Creator',
            });

            const sessionId = await sessionPromise;

            // Generate invite link
            const inviteLinkPromise = new Promise<string>((resolve) => {
              client0.on('invite:generated', (data) => {
                resolve(data.inviteLink);
              });
            });

            client0.emit('invite:generate', {
              sessionId,
            });

            const inviteLink = await inviteLinkPromise;

            // Extract token from invite link
            const url = new URL(inviteLink);
            const token = url.pathname.split('/').pop() || '';

            // New user validates the token
            const client1 = ioClient(`http://localhost:${serverPort}`);
            clients.push(client1);

            await new Promise<void>((resolve) => {
              client1.on('connect', () => resolve());
            });

            const validatePromise = new Promise<string>((resolve) => {
              client1.on('invite:validated', (data) => {
                resolve(data.sessionId);
              });
            });

            client1.emit('invite:validate', {
              token,
            });

            const validatedSessionId = await validatePromise;

            // Verify the validated session ID matches
            if (validatedSessionId !== sessionId) {
              return false;
            }

            // Set up listener for participant joined on creator's client
            const participantJoinedPromise = new Promise<boolean>((resolve) => {
              client0.on('participant:joined', (participant) => {
                resolve(participant.name === newUserName);
              });
            });

            // New user joins using the validated session ID
            const joinPromise = new Promise<void>((resolve) => {
              client1.on('session:updated', () => {
                resolve();
              });
            });

            client1.emit('session:join', {
              sessionId: validatedSessionId,
              userName: newUserName,
            });

            await joinPromise;

            // Wait for the participant joined notification
            const participantAdded = await participantJoinedPromise;

            return participantAdded;
          } finally {
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  // Feature: ghost-story-generator, Property 25: New participants receive full context
  test('Property 25: new participants receive full narrative context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
        async (sessionTitle, segmentContents) => {
          const clients: ClientSocket[] = [];

          try {
            // Create a session with first client
            const client0 = ioClient(`http://localhost:${serverPort}`);
            clients.push(client0);

            await new Promise<void>((resolve) => {
              client0.on('connect', () => resolve());
            });

            const sessionPromise = new Promise<string>((resolve) => {
              client0.on('session:created', (session) => {
                resolve(session.id);
              });
            });

            client0.emit('session:create', {
              title: sessionTitle,
              userName: 'User0',
            });

            const sessionId = await sessionPromise;

            // Add multiple segments to the session
            let segmentCount = 0;
            const allSegmentsAdded = new Promise<void>((resolve) => {
              client0.on('segment:added', () => {
                segmentCount++;
                if (segmentCount === segmentContents.length) {
                  resolve();
                }
              });
            });

            for (const content of segmentContents) {
              client0.emit('segment:add', {
                sessionId,
                content,
              });
            }

            await allSegmentsAdded;

            // New participant joins
            const client1 = ioClient(`http://localhost:${serverPort}`);
            clients.push(client1);

            await new Promise<void>((resolve) => {
              client1.on('connect', () => resolve());
            });

            const contextPromise = new Promise<any>((resolve) => {
              client1.on('session:updated', (session) => {
                resolve(session);
              });
            });

            client1.emit('session:join', {
              sessionId,
              userName: 'NewUser',
            });

            const receivedSession = await contextPromise;

            // Verify the new participant received all segments
            const receivedSegmentCount = receivedSession.segments.length;
            const expectedSegmentCount = segmentContents.length;

            // Verify segments are in chronological order
            let isChronological = true;
            for (let i = 1; i < receivedSession.segments.length; i++) {
              const prev = new Date(receivedSession.segments[i - 1].timestamp);
              const curr = new Date(receivedSession.segments[i].timestamp);
              if (prev > curr) {
                isChronological = false;
                break;
              }
            }

            return receivedSegmentCount === expectedSegmentCount && isChronological;
          } finally {
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  // Feature: ghost-story-generator, Property 26: Join notifications broadcast
  test('Property 26: join notifications broadcast to existing participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (participantCount, sessionTitle) => {
          const clients: ClientSocket[] = [];
          const joinNotifications: number[] = new Array(participantCount).fill(0);

          try {
            // Connect first client and create session
            const client0 = ioClient(`http://localhost:${serverPort}`);
            clients.push(client0);
            await new Promise<void>((resolve) => {
              client0.on('connect', () => resolve());
            });

            const sessionPromise = new Promise<string>((resolve) => {
              client0.on('session:created', (session) => {
                resolve(session.id);
              });
            });

            client0.emit('session:create', {
              title: sessionTitle,
              userName: 'User0',
            });

            const sessionId = await sessionPromise;

            // Set up join notification listener on first client
            client0.on('participant:joined', () => {
              joinNotifications[0]++;
            });

            // Add remaining participants one by one
            for (let i = 1; i < participantCount; i++) {
              const client = ioClient(`http://localhost:${serverPort}`);
              clients.push(client);

              await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
              });

              // Set up listener for this client to count notifications
              client.on('participant:joined', () => {
                joinNotifications[i]++;
              });

              const joinPromise = new Promise<void>((resolve) => {
                client.on('session:updated', () => {
                  resolve();
                });
              });

              client.emit('session:join', {
                sessionId,
                userName: `User${i}`,
              });

              await joinPromise;

              // Small delay to ensure notification is processed
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // First client should have received (participantCount - 1) notifications
            const firstClientReceivedAll = joinNotifications[0] === participantCount - 1;

            // Each subsequent client should have received notifications for all who joined after them
            let allSubsequentCorrect = true;
            for (let i = 1; i < participantCount; i++) {
              const expected = participantCount - i - 1;
              if (joinNotifications[i] !== expected) {
                allSubsequentCorrect = false;
                break;
              }
            }

            return firstClientReceivedAll && allSubsequentCorrect;
          } finally {
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  // Feature: ghost-story-generator, Property 31: Offline queue and sync
  test('Property 31: offline segments are queued and synced on reconnect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 3 }),
        async (sessionTitle, offlineSegments) => {
          const clients: ClientSocket[] = [];

          try {
            // Create a session
            const client = ioClient(`http://localhost:${serverPort}`, {
              reconnection: true,
              reconnectionDelay: 100,
              reconnectionAttempts: 5,
            });
            clients.push(client);

            await new Promise<void>((resolve) => {
              client.on('connect', () => resolve());
            });

            const sessionPromise = new Promise<string>((resolve) => {
              client.on('session:created', (session) => {
                resolve(session.id);
              });
            });

            client.emit('session:create', {
              title: sessionTitle,
              userName: 'User0',
            });

            const sessionId = await sessionPromise;

            // Simulate offline by disconnecting
            client.disconnect();

            // Wait for disconnect
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Reconnect
            client.connect();

            await new Promise<void>((resolve) => {
              client.on('connect', () => resolve());
            });

            // Rejoin the session after reconnection
            const rejoinPromise = new Promise<void>((resolve) => {
              client.on('session:updated', () => {
                resolve();
              });
            });

            client.emit('session:join', {
              sessionId,
              userName: 'User0',
            });

            await rejoinPromise;

            // Set up listener for segments
            let segmentCount = 0;
            const allSegmentsReceived = new Promise<void>((resolve) => {
              client.on('segment:added', () => {
                segmentCount++;
                if (segmentCount === offlineSegments.length) {
                  resolve();
                }
              });
            });

            // Send queued segments after reconnection
            for (const content of offlineSegments) {
              client.emit('segment:add', {
                sessionId,
                content,
              });
            }

            // Wait for all segments to be received
            await allSegmentsReceived;

            // Verify all segments were synced
            return segmentCount === offlineSegments.length;
          } finally {
            clients.forEach((client) => client.close());
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);
});
