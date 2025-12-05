import { Server, Socket } from 'socket.io';
import { StoryManager } from '../services/StoryManager.js';
import { randomUUID } from 'crypto';
import { validateSegment } from '../utils/validation.js';
import { generateInviteLink, validateInviteToken } from '../utils/inviteLinks.js';
import type { Participant, StorySegment } from '../../../shared/types.js';
import { AICoAuthor } from '../services/AICoAuthor.js';

// Helper function to debug room membership
function debugRoom(io: Server, roomName: string) {
  const room = io.sockets.adapter.rooms.get(roomName);
  console.log(`🔍 Room ${roomName} has ${room?.size || 0} sockets:`, Array.from(room || []));
}

export function setupWebSocketHandlers(io: Server, storyManager: StoryManager) {
  // Initialize AI Co-Author with Google Gemini
  console.log('🔑 Initializing AI Co-Author with API key:', process.env.GEMINI_API_KEY ? 'PRESENT' : 'MISSING');
  const aiCoAuthor = new AICoAuthor(
    3, // Trigger every 3 user segments
    20, // Max context segments
    process.env.GEMINI_API_KEY
  );
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Reconnection handler - helps clients restore their session state
    socket.on('session:reconnect', (data: { sessionId: string; participantId: string }) => {
      try {
        const { sessionId, participantId } = data;

        // Get the session
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Rejoin the socket room
        socket.join(sessionId);

        // Store session ID in socket data
        socket.data.sessionId = sessionId;
        socket.data.participantId = participantId;

        // Send current session state to the reconnected client
        socket.emit('session:updated', session);

        // Acknowledge successful reconnection
        socket.emit('session:reconnected', { sessionId });

        console.log(`Client ${socket.id} reconnected to session ${sessionId}`);
      } catch (error) {
        console.error('Error handling reconnection:', error);
        socket.emit('error', {
          message: 'Failed to reconnect to session',
          code: 'RECONNECT_ERROR',
        });
      }
    });

    // Session create event handler
    socket.on('session:create', (data: { title: string; startingPrompt?: string; userName: string }) => {
      try {
        const { title, startingPrompt, userName } = data;

        // Create the session
        const session = storyManager.createSession(title, startingPrompt);

        // Add the creator as a participant
        const participant: Participant = {
          id: socket.id,
          name: userName || 'Anonymous',
          joinedAt: new Date(),
        };
        storyManager.addParticipant(session.id, participant);

        // Join the socket room for this session
        socket.join(session.id);
        console.log(`✅ Socket ${socket.id} joined room: ${session.id}`); // Debug

        // Store session ID in socket data for later use
        socket.data.sessionId = session.id;
        socket.data.participantId = socket.id;

        // Send session created event back to the creator
        socket.emit('session:created', session);

        console.log(`Session created: ${session.id} by ${userName}`);
      } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', {
          message: 'Failed to create session',
          code: 'SESSION_CREATE_ERROR',
        });
      }
    });

    // Session join event handler
    socket.on('session:join', (data: { sessionId: string; userName: string }) => {
      try {
        const { sessionId, userName } = data;

        // Get the session
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Add participant to session
        const participant: Participant = {
          id: socket.id,
          name: userName || 'Anonymous',
          joinedAt: new Date(),
        };
        storyManager.addParticipant(sessionId, participant);

        // Join the socket room
        socket.join(sessionId);

        // Store session ID in socket data
        socket.data.sessionId = sessionId;
        socket.data.participantId = socket.id;

        // Send full session context to the new participant
        socket.emit('session:updated', session);

        // Broadcast to all other participants that someone joined
        socket.to(sessionId).emit('participant:joined', participant);

        console.log(`Participant ${userName} joined session: ${sessionId}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', {
          message: 'Failed to join session',
          code: 'SESSION_JOIN_ERROR',
        });
      }
    });


    // Segment add event handler
    socket.on('segment:add', async (data: { sessionId: string; content: string }) => {
      try {
        const { sessionId, content } = data;

        console.log(`📝 Segment add request from ${socket.id} for session ${sessionId}`); // Debug

        // Validate content
        const validationResult = validateSegment(content);
        if (!validationResult.valid) {
          socket.emit('error', {
            message: validationResult.error || 'Invalid content',
            code: 'CONTENT_VALIDATION_ERROR',
          });
          return;
        }

        // Get the session
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Create the segment
        const segment: StorySegment = {
          id: randomUUID(),
          content: validationResult.sanitized || content,
          contributorId: socket.data.participantId || socket.id,
          contributorType: 'user',
          timestamp: new Date(),
          moodTags: [],
        };

        console.log(`✅ Created segment:`, segment.id, segment.content.substring(0, 50)); // Debug

        // Add segment to session
        storyManager.addSegment(sessionId, segment);

        console.log(`📢 Broadcasting to room: ${sessionId}`); // Debug

        // ⭐ IMPORTANT: Broadcast to ALL clients in the room (including sender)
        io.to(sessionId).emit('segment:added', segment);

        // Also emit directly to sender as backup
        socket.emit('segment:added', segment);

        // Send acknowledgment
        socket.emit('segment:acknowledged', { segmentId: segment.id });

        console.log(`✅ Segment ${segment.id} broadcasted successfully`); // Debug

        // ⭐ AI CO-AUTHOR LOGIC ⭐
        const updatedSession = storyManager.getSession(sessionId);
        if (updatedSession) {
          const userSegments = updatedSession.segments.filter(s => s.contributorType === 'user');

          if (userSegments.length > 0 && userSegments.length % 3 === 0) {
            console.log(`🤖 AI trigger threshold reached (${userSegments.length} user segments)`);

            try {
              const context = aiCoAuthor.buildNarrativeContext(updatedSession.segments);
              console.log(`🤖 Generating AI horror element...`);
              
              const horrorElement = await aiCoAuthor.generateHorrorElement(context);

              const aiSegment: StorySegment = {
                id: randomUUID(),
                content: horrorElement.content,
                contributorId: 'ai-coauthor',
                contributorType: 'ai',
                timestamp: new Date(),
                moodTags: horrorElement.tags,
              };

              storyManager.addSegment(sessionId, aiSegment);
              
              console.log(`🤖 AI segment created:`, {
                id: aiSegment.id,
                content: aiSegment.content,
                contributorType: aiSegment.contributorType,
                tags: aiSegment.tags
              });
              
              io.to(sessionId).emit('segment:added', aiSegment);
              console.log(`🤖 AI segment broadcasted to room ${sessionId}`);
            } catch (aiError) {
              console.error('❌ Failed to generate AI horror element:', aiError);
              // Emit error to clients so they know AI generation failed
              io.to(sessionId).emit('error', {
                message: 'AI co-author failed to generate content',
                code: 'AI_GENERATION_ERROR',
                details: aiError instanceof Error ? aiError.message : 'Unknown error'
              });
            }
          }
        }

        console.log(`Segment added to session ${sessionId}`);
      } catch (error) {
        console.error('Error adding segment:', error);
        socket.emit('error', {
          message: 'Failed to add segment',
          code: 'SEGMENT_ADD_ERROR',
        });
      }
    });

    // Session export event handler
    socket.on('session:export', (data: { sessionId: string; format: 'text' | 'html' }) => {
      try {
        const { sessionId, format } = data;

        // Get the session
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Export the session
        const exportedContent = storyManager.exportSession(sessionId, format);

        // Send the exported content back to the requester
        socket.emit('session:exported', {
          sessionId,
          format,
          content: exportedContent,
        });

        console.log(`Session ${sessionId} exported as ${format}`);
      } catch (error) {
        console.error('Error exporting session:', error);
        socket.emit('error', {
          message: 'Failed to export session',
          code: 'SESSION_EXPORT_ERROR',
        });
      }
    });

    // Invite link generation event handler
    socket.on('invite:generate', (data: { sessionId: string; baseUrl?: string }) => {
      try {
        const { sessionId, baseUrl } = data;

        // Verify the session exists
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Generate the invite link
        const inviteLink = generateInviteLink(sessionId, baseUrl);

        // Send the invite link back to the requester
        socket.emit('invite:generated', {
          sessionId,
          inviteLink,
        });

        console.log(`Invite link generated for session ${sessionId}`);
      } catch (error) {
        console.error('Error generating invite link:', error);
        socket.emit('error', {
          message: 'Failed to generate invite link',
          code: 'INVITE_GENERATE_ERROR',
        });
      }
    });

    // Invite link validation event handler
    socket.on('invite:validate', (data: { token: string }) => {
      try {
        const { token } = data;

        // Validate the token
        const sessionId = validateInviteToken(token);

        if (!sessionId) {
          socket.emit('error', {
            message: 'Invalid or expired invite token',
            code: 'INVALID_INVITE_TOKEN',
          });
          return;
        }

        // Verify the session still exists
        const session = storyManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Send the session ID back
        socket.emit('invite:validated', {
          sessionId,
        });

        console.log(`Invite token validated for session ${sessionId}`);
      } catch (error) {
        console.error('Error validating invite token:', error);
        socket.emit('error', {
          message: 'Failed to validate invite token',
          code: 'INVITE_VALIDATE_ERROR',
        });
      }
    });
  });
}
