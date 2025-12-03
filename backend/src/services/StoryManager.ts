import { StorySession, StorySegment, Participant } from '../../../shared/types.js';
import { randomUUID } from 'crypto';

export class StoryManager {
  private sessions: Map<string, StorySession> = new Map();

  createSession(title: string, startingPrompt?: string): StorySession {
    const session: StorySession = {
      id: randomUUID(),
      title,
      startingPrompt,
      participants: [],
      segments: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): StorySession | undefined {
    return this.sessions.get(sessionId);
  }

  addParticipant(sessionId: string, participant: Participant): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants.push(participant);
      session.lastActivityAt = new Date();
    }
  }

  addSegment(sessionId: string, segment: StorySegment): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.segments.push(segment);
      // Sort segments by timestamp to maintain chronological order
      session.segments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      session.lastActivityAt = new Date();
    }
  }

  getSegments(sessionId: string): StorySegment[] {
    const session = this.sessions.get(sessionId);
    return session ? session.segments : [];
  }

  exportSession(sessionId: string, format: 'text' | 'html'): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (format === 'text') {
      return this.exportAsText(session);
    } else {
      return this.exportAsHtml(session);
    }
  }

  private exportAsText(session: StorySession): string {
    let output = `${session.title}\n`;
    output += `Created: ${session.createdAt.toISOString()}\n\n`;

    for (const segment of session.segments) {
      output += `[${segment.contributorId}] ${segment.content}\n`;
    }

    return output;
  }

  private exportAsHtml(session: StorySession): string {
    let output = `<html><head><title>${session.title}</title></head><body>`;
    output += `<h1>${session.title}</h1>`;
    output += `<p>Created: ${session.createdAt.toISOString()}</p>`;

    for (const segment of session.segments) {
      output += `<p><strong>${segment.contributorId}:</strong> ${segment.content}</p>`;
    }

    output += `</body></html>`;
    return output;
  }
}
