// Shared TypeScript types and interfaces used by both frontend and backend

export interface StorySession {
  id: string;
  title: string;
  startingPrompt?: string;
  participants: Participant[];
  segments: StorySegment[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface StorySegment {
  id: string;
  content: string;
  contributorId: string;
  contributorType: 'user' | 'ai';
  timestamp: Date;
  moodTags: string[];
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
}

export interface NarrativeContext {
  segments: StorySegment[];
  characters: string[];
  locations: string[];
  timeperiod?: string;
  genre?: string;
}

export interface HorrorElement {
  content: string;
  intensity: number;
  tags: string[];
}

export interface AudioSettings {
  masterVolume: number;
  ambientVolume: number;
  effectsVolume: number;
  muted: boolean;
}

export interface SoundLayer {
  type: 'ambient' | 'effect';
  intensity: number;
}

// WebSocket event interfaces
export interface ClientEvents {
  'session:create': (data: { title: string; startingPrompt?: string }) => void;
  'session:join': (sessionId: string) => void;
  'segment:add': (data: { sessionId: string; content: string }) => void;
  'session:export': (sessionId: string) => void;
}

export interface ServerEvents {
  'session:created': (session: StorySession) => void;
  'session:updated': (session: StorySession) => void;
  'segment:added': (segment: StorySegment) => void;
  'participant:joined': (participant: Participant) => void;
  'error': (error: { message: string; code: string }) => void;
}

export interface SessionState {
  sessionId: string;
  activeParticipants: Set<string>;
  lastAITrigger: number;
  currentMood: string[];
  audioState: {
    activeLayers: string[];
    intensity: number;
  };
}
