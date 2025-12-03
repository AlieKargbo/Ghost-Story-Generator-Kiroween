import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorySession, StorySegment, Participant } from '../../../shared/types';

interface SessionStore {
  currentSession: StorySession | null;
  isConnected: boolean;
  isOffline: boolean;
  optimisticSegments: Map<string, StorySegment>;
  setSession: (session: StorySession) => void;
  addSegment: (segment: StorySegment) => void;
  addOptimisticSegment: (segment: StorySegment) => void;
  removeOptimisticSegment: (segmentId: string) => void;
  addParticipant: (participant: Participant) => void;
  setConnected: (connected: boolean) => void;
  setOffline: (offline: boolean) => void;
  clearSession: () => void;
  restoreSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      currentSession: null,
      isConnected: false,
      isOffline: false,
      optimisticSegments: new Map(),
      
      setSession: (session) => set({ currentSession: session }),
      
      addSegment: (segment) =>
        set((state) => {
          // Remove from optimistic segments if it exists
          const newOptimistic = new Map(state.optimisticSegments);
          newOptimistic.delete(segment.id);
          
          return {
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  segments: [...state.currentSession.segments, segment],
                  lastActivityAt: new Date(),
                }
              : null,
            optimisticSegments: newOptimistic,
          };
        }),
      
      addOptimisticSegment: (segment) =>
        set((state) => {
          const newOptimistic = new Map(state.optimisticSegments);
          newOptimistic.set(segment.id, segment);
          
          return {
            optimisticSegments: newOptimistic,
          };
        }),
      
      removeOptimisticSegment: (segmentId) =>
        set((state) => {
          const newOptimistic = new Map(state.optimisticSegments);
          newOptimistic.delete(segmentId);
          
          return {
            optimisticSegments: newOptimistic,
          };
        }),
      
      addParticipant: (participant) =>
        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                participants: [...state.currentSession.participants, participant],
              }
            : null,
        })),
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      setOffline: (offline) => set({ isOffline: offline }),
      
      clearSession: () => set({ currentSession: null, optimisticSegments: new Map() }),
      
      restoreSession: () => {
        // Session is automatically restored from localStorage by persist middleware
        const state = get();
        if (state.currentSession) {
          console.log('Session restored from storage:', state.currentSession.id);
        }
      },
    }),
    {
      name: 'ghost-story-session',
      partialize: (state) => ({
        currentSession: state.currentSession,
      }),
    }
  )
);
