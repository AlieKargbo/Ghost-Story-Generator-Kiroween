import { StorySession, StorySegment, Participant } from '../../../shared/types.js';
import { randomUUID } from 'crypto';

export class StoryManager {
  private sessions: Map<string, StorySession> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

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
      // Check if participant already exists (by name, not socket ID)
      const existingParticipant = session.participants.find(
        p => p.name === participant.name
      );
      
      if (!existingParticipant) {
        session.participants.push(participant);
        console.log(`Participant ${participant.name} added to session ${sessionId}`);
      } else {
        console.log(`Participant ${participant.name} already in session ${sessionId}`);
      }
      
      session.lastActivityAt = new Date();
      this.refreshSessionTimeout(sessionId);
    }
  }

  addSegment(sessionId: string, segment: StorySegment): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.segments.push(segment);
      // Sort segments by timestamp to maintain chronological order
      session.segments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      session.lastActivityAt = new Date();
      this.refreshSessionTimeout(sessionId);
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
    output += `Created: ${session.createdAt.toISOString()}\n`;
    output += `Participants: ${session.participants.map(p => p.name).join(', ')}\n\n`;

    for (const segment of session.segments) {
      const contributor = session.participants.find(p => p.id === segment.contributorId);
      const name = contributor ? contributor.name : segment.contributorId;
      output += `[${name}] ${segment.content}\n\n`;
    }

    return output;
  }

  private exportAsHtml(session: StorySession): string {
    let output = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${session.title}</title>`;
    output += `<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;background:#0a0a0f;color:#e8e8f0;}`;
    output += `h1{color:#8b5cf6;}.segment{margin:20px 0;padding:15px;border-left:3px solid #6b46c1;}`;
    output += `.ai-segment{background:#1e1433;border-color:#8b5cf6;}.contributor{font-weight:bold;color:#b8b8c8;}</style></head><body>`;
    output += `<h1>${session.title}</h1>`;
    output += `<p><em>Created: ${session.createdAt.toLocaleString()}</em></p>`;
    output += `<p><em>Participants: ${session.participants.map(p => p.name).join(', ')}</em></p>`;

    for (const segment of session.segments) {
      const contributor = session.participants.find(p => p.id === segment.contributorId);
      const name = contributor ? contributor.name : (segment.contributorType === 'ai' ? 'AI Co-Author' : segment.contributorId);
      const segmentClass = segment.contributorType === 'ai' ? 'ai-segment' : 'user-segment';
      output += `<div class="segment ${segmentClass}"><span class="contributor">${name}:</span> ${segment.content}</div>`;
    }

    output += `</body></html>`;
    return output;
  }

  private refreshSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimer = this.sessionTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timeout to delete session after inactivity
    const timer = setTimeout(() => {
      this.sessions.delete(sessionId);
      this.sessionTimers.delete(sessionId);
      console.log(`Session ${sessionId} expired and removed`);
    }, this.SESSION_TIMEOUT);

    this.sessionTimers.set(sessionId, timer);
  }

  // Utility method to list all active sessions (for debugging)
  getAllSessions(): StorySession[] {
    return Array.from(this.sessions.values());
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.size;
  }
}
