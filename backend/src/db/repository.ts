import { Pool, QueryResult } from 'pg';
import { getPool } from './connection.js';
import type { StorySession, StorySegment, Participant } from '../../../shared/types.js';

export class DatabaseRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  // Session CRUD operations
  async createSession(
    title: string,
    startingPrompt?: string
  ): Promise<StorySession> {
    const query = `
      INSERT INTO sessions (title, starting_prompt, created_at, last_activity_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, title, starting_prompt, created_at, last_activity_at, status
    `;
    
    try {
      const result = await this.pool.query(query, [title, startingPrompt]);
      const row = result.rows[0];
      
      return {
        id: row.id,
        title: row.title,
        startingPrompt: row.starting_prompt,
        participants: [],
        segments: [],
        createdAt: row.created_at,
        lastActivityAt: row.last_activity_at,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(sessionId: string): Promise<StorySession | null> {
    const sessionQuery = `
      SELECT id, title, starting_prompt, created_at, last_activity_at, status
      FROM sessions
      WHERE id = $1
    `;
    
    try {
      const sessionResult = await this.pool.query(sessionQuery, [sessionId]);
      
      if (sessionResult.rows.length === 0) {
        return null;
      }
      
      const row = sessionResult.rows[0];
      
      // Fetch participants and segments
      const [participants, segments] = await Promise.all([
        this.getParticipants(sessionId),
        this.getSegments(sessionId),
      ]);
      
      return {
        id: row.id,
        title: row.title,
        startingPrompt: row.starting_prompt,
        participants,
        segments,
        createdAt: row.created_at,
        lastActivityAt: row.last_activity_at,
      };
    } catch (error) {
      console.error('Error getting session:', error);
      throw new Error('Failed to retrieve session');
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const query = `
      UPDATE sessions
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    try {
      await this.pool.query(query, [sessionId]);
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw new Error('Failed to update session activity');
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE id = $1';
    
    try {
      await this.pool.query(query, [sessionId]);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  // Segment operations
  async addSegment(
    sessionId: string,
    content: string,
    contributorId: string,
    contributorType: 'user' | 'ai',
    moodTags: string[] = []
  ): Promise<StorySegment> {
    const query = `
      INSERT INTO segments (session_id, content, contributor_id, contributor_type, timestamp, mood_tags)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
      RETURNING id, session_id, content, contributor_id, contributor_type, timestamp, mood_tags
    `;
    
    try {
      const result = await this.pool.query(query, [
        sessionId,
        content,
        contributorId,
        contributorType,
        moodTags,
      ]);
      
      const row = result.rows[0];
      
      // Update session activity
      await this.updateSessionActivity(sessionId);
      
      return {
        id: row.id,
        content: row.content,
        contributorId: row.contributor_id,
        contributorType: row.contributor_type,
        timestamp: row.timestamp,
        moodTags: row.mood_tags || [],
      };
    } catch (error) {
      console.error('Error adding segment:', error);
      throw new Error('Failed to add segment');
    }
  }

  async getSegments(sessionId: string): Promise<StorySegment[]> {
    const query = `
      SELECT id, content, contributor_id, contributor_type, timestamp, mood_tags
      FROM segments
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `;
    
    try {
      const result = await this.pool.query(query, [sessionId]);
      
      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        contributorId: row.contributor_id,
        contributorType: row.contributor_type,
        timestamp: row.timestamp,
        moodTags: row.mood_tags || [],
      }));
    } catch (error) {
      console.error('Error getting segments:', error);
      throw new Error('Failed to retrieve segments');
    }
  }

  // Participant operations
  async addParticipant(
    sessionId: string,
    name: string
  ): Promise<Participant> {
    const query = `
      INSERT INTO participants (session_id, name, joined_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, session_id, name, joined_at
    `;
    
    try {
      const result = await this.pool.query(query, [sessionId, name]);
      const row = result.rows[0];
      
      return {
        id: row.id,
        name: row.name,
        joinedAt: row.joined_at,
      };
    } catch (error) {
      console.error('Error adding participant:', error);
      throw new Error('Failed to add participant');
    }
  }

  async getParticipants(sessionId: string): Promise<Participant[]> {
    const query = `
      SELECT id, name, joined_at
      FROM participants
      WHERE session_id = $1
      ORDER BY joined_at ASC
    `;
    
    try {
      const result = await this.pool.query(query, [sessionId]);
      
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        joinedAt: row.joined_at,
      }));
    } catch (error) {
      console.error('Error getting participants:', error);
      throw new Error('Failed to retrieve participants');
    }
  }

  async removeParticipant(participantId: string): Promise<void> {
    const query = 'DELETE FROM participants WHERE id = $1';
    
    try {
      await this.pool.query(query, [participantId]);
    } catch (error) {
      console.error('Error removing participant:', error);
      throw new Error('Failed to remove participant');
    }
  }
}
