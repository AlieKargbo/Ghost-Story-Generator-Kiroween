import fc from 'fast-check';
import { SessionCache } from '../cache/sessionCache.js';
import type { SessionState } from '../../../shared/types.js';
import Redis from 'ioredis';

// Feature: ghost-story-generator, Property 32: Session state recovery
// Validates: Requirements 11.5

describe('SessionCache Property Tests', () => {
  let redis: Redis;
  let sessionCache: SessionCache;
  let redisAvailable = false;

  beforeAll(async () => {
    // Use a test Redis instance
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: 1, // Use a separate database for tests
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry on connection failure
    });

    try {
      await redis.connect();
      redisAvailable = true;
      sessionCache = new SessionCache(redis);
    } catch (error) {
      console.log('Redis not available, skipping tests');
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      await redis.flushdb(); // Clean up test database
      await redis.quit();
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (redisAvailable) {
      await redis.flushdb();
    }
  });

  test('Property 32: Session state recovery - storing and retrieving session state preserves all data', async () => {
    if (!redisAvailable) {
      console.log('Skipping test: Redis not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          activeParticipants: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
          lastAITrigger: fc.nat(100),
          currentMood: fc.array(
            fc.constantFrom('horror', 'calm', 'tense', 'mysterious', 'suspenseful'),
            { minLength: 0, maxLength: 5 }
          ),
          audioState: fc.record({
            activeLayers: fc.array(
              fc.constantFrom('ambient', 'wind', 'thunder', 'creaking', 'whispers'),
              { minLength: 0, maxLength: 5 }
            ),
            intensity: fc.double({ min: 0, max: 1 }),
          }),
        }),
        async (stateData) => {
          // Create SessionState with Set for activeParticipants
          const originalState: SessionState = {
            sessionId: stateData.sessionId,
            activeParticipants: new Set(stateData.activeParticipants),
            lastAITrigger: stateData.lastAITrigger,
            currentMood: stateData.currentMood,
            audioState: stateData.audioState,
          };

          // Store the session state
          await sessionCache.setSessionState(stateData.sessionId, originalState);

          // Retrieve the session state
          const retrievedState = await sessionCache.getSessionState(stateData.sessionId);

          // Verify the state was recovered correctly
          expect(retrievedState).not.toBeNull();
          expect(retrievedState!.sessionId).toBe(originalState.sessionId);
          expect(retrievedState!.lastAITrigger).toBe(originalState.lastAITrigger);
          expect(retrievedState!.currentMood).toEqual(originalState.currentMood);
          expect(retrievedState!.audioState).toEqual(originalState.audioState);
          
          // Compare Sets
          expect(Array.from(retrievedState!.activeParticipants).sort()).toEqual(
            Array.from(originalState.activeParticipants).sort()
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Adding participants to cached session preserves existing state', async () => {
    if (!redisAvailable) {
      console.log('Skipping test: Redis not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          initialParticipants: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          newParticipant: fc.uuid(),
          lastAITrigger: fc.nat(100),
          currentMood: fc.array(fc.constantFrom('horror', 'calm', 'tense'), { maxLength: 3 }),
        }),
        async (data) => {
          // Create initial state
          const initialState: SessionState = {
            sessionId: data.sessionId,
            activeParticipants: new Set(data.initialParticipants),
            lastAITrigger: data.lastAITrigger,
            currentMood: data.currentMood,
            audioState: { activeLayers: [], intensity: 0.5 },
          };

          await sessionCache.setSessionState(data.sessionId, initialState);

          // Add a new participant
          await sessionCache.addParticipant(data.sessionId, data.newParticipant);

          // Retrieve and verify
          const updatedState = await sessionCache.getSessionState(data.sessionId);

          expect(updatedState).not.toBeNull();
          expect(updatedState!.activeParticipants.has(data.newParticipant)).toBe(true);
          expect(updatedState!.lastAITrigger).toBe(data.lastAITrigger);
          expect(updatedState!.currentMood).toEqual(data.currentMood);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Removing participants from cached session preserves other state', async () => {
    if (!redisAvailable) {
      console.log('Skipping test: Redis not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          participants: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          lastAITrigger: fc.nat(100),
        }),
        async (data) => {
          const initialState: SessionState = {
            sessionId: data.sessionId,
            activeParticipants: new Set(data.participants),
            lastAITrigger: data.lastAITrigger,
            currentMood: ['horror'],
            audioState: { activeLayers: ['ambient'], intensity: 0.7 },
          };

          await sessionCache.setSessionState(data.sessionId, initialState);

          // Remove the first participant
          const participantToRemove = data.participants[0];
          await sessionCache.removeParticipant(data.sessionId, participantToRemove);

          // Retrieve and verify
          const updatedState = await sessionCache.getSessionState(data.sessionId);

          expect(updatedState).not.toBeNull();
          expect(updatedState!.activeParticipants.has(participantToRemove)).toBe(false);
          expect(updatedState!.lastAITrigger).toBe(data.lastAITrigger);
          expect(updatedState!.currentMood).toEqual(['horror']);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
