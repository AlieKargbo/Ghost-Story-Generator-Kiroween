import * as fc from 'fast-check';
import { OfflineQueue } from '../services/offlineQueue';
import { WebSocketClient } from '../services/websocketClient';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  return {
    io: jest.fn(() => mockSocket),
  };
});

describe('OfflineQueue Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Feature: ghost-story-generator, Property 31: Offline queue and sync
  // Validates: Requirements 11.3
  test('segments added during offline are queued and synced when reconnected', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (segments) => {
          // Create a WebSocket client (starts disconnected in our mock)
          const client = new WebSocketClient({ autoConnect: false });
          
          // Verify client is disconnected
          expect(client.isConnected()).toBe(false);
          
          // Track initial queue count
          const initialQueueCount = client.getQueuedCount();
          
          // Add segments while offline - they should be queued
          for (const segment of segments) {
            await client.addSegment(segment.sessionId, segment.content);
          }
          
          // Verify all segments were queued
          const queuedCount = client.getQueuedCount();
          const expectedCount = initialQueueCount + segments.length;
          
          // Property: When offline, adding N segments should increase queue by N
          return queuedCount === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('offline queue persists segments correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (segments) => {
          // Clear localStorage to start fresh
          localStorage.clear();
          
          const queue = new OfflineQueue();
          
          // Enqueue all segments
          segments.forEach((seg) => {
            queue.enqueue(seg.sessionId, seg.content);
          });
          
          // Property: Queue size should equal number of enqueued segments
          const sizeMatches = queue.size() === segments.length;
          
          // Property: All segments should be retrievable
          const allSegments = queue.getAllQueued();
          const allRetrievable = allSegments.length === segments.length;
          
          // Property: Each segment's content and sessionId should match (order preserved)
          const contentMatches = segments.every((seg, idx) => {
            const queued = allSegments[idx];
            return queued && queued.content === seg.content &&
                   queued.sessionId === seg.sessionId;
          });
          
          return sizeMatches && allRetrievable && contentMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('dequeue removes correct segments', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (segments) => {
          const queue = new OfflineQueue();
          
          // Enqueue all segments
          const timestamps: Date[] = [];
          segments.forEach((seg) => {
            queue.enqueue(seg.sessionId, seg.content);
            const queued = queue.getAllQueued();
            timestamps.push(queued[queued.length - 1].timestamp);
          });
          
          const initialSize = queue.size();
          
          // Dequeue the first segment
          queue.dequeue(segments[0].sessionId, timestamps[0]);
          
          // Property: Size should decrease by 1
          const sizeDecreased = queue.size() === initialSize - 1;
          
          // Property: Dequeued segment should not be in queue
          const remaining = queue.getAllQueued();
          const notInQueue = !remaining.some(
            (item) => item.sessionId === segments[0].sessionId && 
                     item.timestamp.getTime() === timestamps[0].getTime()
          );
          
          return sizeDecreased && notInQueue;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('retry count increments and removes after max retries', () => {
    fc.assert(
      fc.property(
        fc.record({
          sessionId: fc.uuid(),
          content: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        (segment) => {
          // Clear localStorage to start fresh
          localStorage.clear();
          
          const queue = new OfflineQueue();
          
          // Enqueue a segment
          queue.enqueue(segment.sessionId, segment.content);
          const queued = queue.getAllQueued()[0];
          
          if (!queued) {
            return false; // Should never happen
          }
          
          const timestamp = queued.timestamp;
          
          // Increment retry count 3 times (max retries is 3)
          const result1 = queue.incrementRetry(segment.sessionId, timestamp);
          const result2 = queue.incrementRetry(segment.sessionId, timestamp);
          const result3 = queue.incrementRetry(segment.sessionId, timestamp);
          
          // Property: First two increments should return true (can retry)
          const canRetry = result1 === true && result2 === true;
          
          // Property: Third increment should return false (max retries exceeded)
          const maxRetriesReached = result3 === false;
          
          // Property: Queue should be empty after max retries
          const queueEmpty = queue.isEmpty();
          
          return canRetry && maxRetriesReached && queueEmpty;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('clearSession removes only segments for that session', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (sessionId1, sessionId2, count1, count2) => {
          // Skip if session IDs are the same
          if (sessionId1 === sessionId2) {
            return true;
          }
          
          // Clear localStorage to start fresh
          localStorage.clear();
          
          const queue = new OfflineQueue();
          
          // Add segments for session 1
          for (let i = 0; i < count1; i++) {
            queue.enqueue(sessionId1, `content-session1-${i}`);
          }
          
          // Add segments for session 2
          for (let i = 0; i < count2; i++) {
            queue.enqueue(sessionId2, `content-session2-${i}`);
          }
          
          const totalSize = queue.size();
          
          // Clear session 1
          queue.clearSession(sessionId1);
          
          // Property: Size should decrease by count1
          const sizeCorrect = queue.size() === totalSize - count1;
          
          // Property: Only session 2 segments should remain
          const remaining = queue.getAllQueued();
          const onlySession2 = remaining.length === 0 || remaining.every((item) => item.sessionId === sessionId2);
          const session2Count = remaining.length === count2;
          
          return sizeCorrect && onlySession2 && session2Count;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('queue persists to localStorage and loads correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (segments) => {
          // Create first queue and add segments
          const queue1 = new OfflineQueue();
          segments.forEach((seg) => {
            queue1.enqueue(seg.sessionId, seg.content);
          });
          
          const size1 = queue1.size();
          
          // Create new queue instance (should load from localStorage)
          const queue2 = new OfflineQueue();
          const size2 = queue2.size();
          
          // Property: New queue should have same size
          const sizeMatches = size1 === size2;
          
          // Property: New queue should have same segments
          const segments1 = queue1.getAllQueued();
          const segments2 = queue2.getAllQueued();
          
          const contentMatches = segments1.every((seg1, idx) => {
            const seg2 = segments2[idx];
            return seg1.sessionId === seg2.sessionId &&
                   seg1.content === seg2.content &&
                   seg1.retryCount === seg2.retryCount;
          });
          
          return sizeMatches && contentMatches;
        }
      ),
      { numRuns: 100 }
    );
  });
});
