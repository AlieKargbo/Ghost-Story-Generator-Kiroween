import Redis from 'ioredis';
import { getRedisClient } from './redis.js';
import type { SessionState } from '../../../shared/types.js';

export class SessionCache {
  private redis: Redis;
  private readonly TTL = 3600; // 1 hour in seconds

  constructor(redis?: Redis) {
    this.redis = redis || getRedisClient();
  }

  private getKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  async setSessionState(sessionId: string, state: SessionState): Promise<void> {
    const key = this.getKey(sessionId);
    
    try {
      // Convert Set to Array for JSON serialization
      const serializedState = {
        ...state,
        activeParticipants: Array.from(state.activeParticipants),
      };
      
      await this.redis.setex(
        key,
        this.TTL,
        JSON.stringify(serializedState)
      );
    } catch (error) {
      console.error('Error setting session state in cache:', error);
      throw new Error('Failed to cache session state');
    }
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    const key = this.getKey(sessionId);
    
    try {
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      
      // Convert Array back to Set
      return {
        ...parsed,
        activeParticipants: new Set(parsed.activeParticipants),
      };
    } catch (error) {
      console.error('Error getting session state from cache:', error);
      throw new Error('Failed to retrieve cached session state');
    }
  }

  async updateSessionState(
    sessionId: string,
    updates: Partial<SessionState>
  ): Promise<void> {
    try {
      const currentState = await this.getSessionState(sessionId);
      
      if (!currentState) {
        throw new Error('Session state not found in cache');
      }
      
      const updatedState: SessionState = {
        ...currentState,
        ...updates,
      };
      
      await this.setSessionState(sessionId, updatedState);
    } catch (error) {
      console.error('Error updating session state in cache:', error);
      throw new Error('Failed to update cached session state');
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const key = this.getKey(sessionId);
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Error invalidating session cache:', error);
      throw new Error('Failed to invalidate session cache');
    }
  }

  async refreshTTL(sessionId: string): Promise<void> {
    const key = this.getKey(sessionId);
    
    try {
      await this.redis.expire(key, this.TTL);
    } catch (error) {
      console.error('Error refreshing session TTL:', error);
      throw new Error('Failed to refresh session TTL');
    }
  }

  async addParticipant(sessionId: string, participantId: string): Promise<void> {
    try {
      const state = await this.getSessionState(sessionId);
      
      if (!state) {
        throw new Error('Session state not found in cache');
      }
      
      state.activeParticipants.add(participantId);
      await this.setSessionState(sessionId, state);
    } catch (error) {
      console.error('Error adding participant to cache:', error);
      throw new Error('Failed to add participant to cache');
    }
  }

  async removeParticipant(sessionId: string, participantId: string): Promise<void> {
    try {
      const state = await this.getSessionState(sessionId);
      
      if (!state) {
        return; // Session already expired or doesn't exist
      }
      
      state.activeParticipants.delete(participantId);
      await this.setSessionState(sessionId, state);
    } catch (error) {
      console.error('Error removing participant from cache:', error);
      throw new Error('Failed to remove participant from cache');
    }
  }

  async getActiveParticipants(sessionId: string): Promise<Set<string>> {
    try {
      const state = await this.getSessionState(sessionId);
      return state?.activeParticipants || new Set();
    } catch (error) {
      console.error('Error getting active participants from cache:', error);
      return new Set();
    }
  }
}
