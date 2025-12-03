/**
 * Custom hook for WebSocket integration with session store
 * Manages event handlers and state synchronization
 */

import { useEffect, useRef, useCallback } from 'react';
import { WebSocketClient } from '../services/websocketClient';
import { useSessionStore } from '../store/sessionStore';
import { getWebSocketUrl } from '../utils/env';
import type { StorySession, StorySegment, Participant } from '../../../shared/types';

export function useWebSocket() {
  const clientRef = useRef<WebSocketClient | null>(null);
  const setSession = useSessionStore((state) => state.setSession);
  const addSegment = useSessionStore((state) => state.addSegment);
  const addParticipant = useSessionStore((state) => state.addParticipant);
  const setConnected = useSessionStore((state) => state.setConnected);
  const setOffline = useSessionStore((state) => state.setOffline);

  // Initialize WebSocket client
  useEffect(() => {
    if (!clientRef.current) {
      const wsUrl = getWebSocketUrl();
      clientRef.current = new WebSocketClient({ url: wsUrl, autoConnect: true });

      // Set up connection status listener
      clientRef.current.onStatusChange((status) => {
        setConnected(status === 'connected');
        setOffline(status === 'disconnected' || status === 'reconnecting');
      });
    }

    const client = clientRef.current;

    // Restore session context if available (for page refresh)
    const currentSession = useSessionStore.getState().currentSession;
    if (currentSession && currentSession.participants.length > 0) {
      const currentParticipant = currentSession.participants[currentSession.participants.length - 1];
      client.setSessionContext(currentSession.id, currentParticipant.id);
    }

    // Set up event handlers
    const handleSessionCreated = (session: StorySession) => {
      console.log('Session created:', session);
      setSession(session);
      
      // Store session context for reconnection
      if (session.participants.length > 0) {
        const currentParticipant = session.participants[session.participants.length - 1];
        client.setSessionContext(session.id, currentParticipant.id);
      }
    };

    const handleSessionUpdated = (session: StorySession) => {
      console.log('Session updated:', session);
      setSession(session);
    };

    const handleSegmentAdded = (segment: StorySegment) => {
      console.log('Segment added:', segment);
      addSegment(segment);
    };

    const handleParticipantJoined = (participant: Participant) => {
      console.log('Participant joined:', participant);
      addParticipant(participant);
    };

    const handleError = (error: { message: string; code: string }) => {
      console.error('WebSocket error:', error);
      // You could show a toast notification here
      alert(`Error: ${error.message}`);
    };

    const handleSessionReconnected = (data: { sessionId: string }) => {
      console.log('Reconnected to session:', data.sessionId);
    };

    const handleSegmentAcknowledged = (data: { segmentId: string }) => {
      console.log('Segment acknowledged:', data.segmentId);
    };

    const handleSessionExported = (data: { sessionId: string; format: string; content: string }) => {
      console.log('Session exported:', data);
      
      // Create a download link
      const blob = new Blob([data.content], { 
        type: data.format === 'html' ? 'text/html' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-${data.sessionId}.${data.format === 'html' ? 'html' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleInviteGenerated = (data: { sessionId: string; inviteLink: string }) => {
      console.log('Invite link generated:', data.inviteLink);
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.inviteLink).then(() => {
        alert('Invite link copied to clipboard!');
      }).catch((err) => {
        console.error('Failed to copy invite link:', err);
        alert(`Invite link: ${data.inviteLink}`);
      });
    };

    // Register event handlers
    client.on('session:created', handleSessionCreated);
    client.on('session:updated', handleSessionUpdated);
    client.on('segment:added', handleSegmentAdded);
    client.on('participant:joined', handleParticipantJoined);
    client.on('error', handleError);
    client.on('session:reconnected', handleSessionReconnected);
    client.on('segment:acknowledged', handleSegmentAcknowledged);
    client.on('session:exported', handleSessionExported);
    client.on('invite:generated', handleInviteGenerated);

    // Cleanup on unmount
    return () => {
      client.off('session:created', handleSessionCreated);
      client.off('session:updated', handleSessionUpdated);
      client.off('segment:added', handleSegmentAdded);
      client.off('participant:joined', handleParticipantJoined);
      client.off('error', handleError);
      client.off('session:reconnected', handleSessionReconnected);
      client.off('segment:acknowledged', handleSegmentAcknowledged);
      client.off('session:exported', handleSessionExported);
      client.off('invite:generated', handleInviteGenerated);
    };
  }, [setSession, addSegment, addParticipant, setConnected, setOffline]);

  // Return methods to interact with WebSocket
  const createSession = useCallback((title: string, userName: string, startingPrompt?: string) => {
    if (clientRef.current) {
      clientRef.current.createSession(title, userName, startingPrompt);
    }
  }, []);

  const joinSession = useCallback((sessionId: string, userName: string) => {
    if (clientRef.current) {
      clientRef.current.joinSession(sessionId, userName);
    }
  }, []);

  const addSegmentToSession = useCallback((sessionId: string, content: string) => {
    if (clientRef.current) {
      return clientRef.current.addSegment(sessionId, content);
    }
    return Promise.reject(new Error('WebSocket client not initialized'));
  }, []);

  const exportSession = useCallback((sessionId: string, format: 'text' | 'html') => {
    if (clientRef.current) {
      clientRef.current.exportSession(sessionId, format);
    }
  }, []);

  const generateInviteLink = useCallback((sessionId: string) => {
    if (clientRef.current) {
      const baseUrl = window.location.origin;
      clientRef.current.generateInviteLink(sessionId, baseUrl);
    }
  }, []);

  const getConnectionStatus = useCallback(() => {
    return clientRef.current?.getConnectionStatus() || 'disconnected';
  }, []);

  const getQueuedCount = useCallback(() => {
    return clientRef.current?.getQueuedCount() || 0;
  }, []);

  return {
    createSession,
    joinSession,
    addSegment: addSegmentToSession,
    exportSession,
    generateInviteLink,
    getConnectionStatus,
    getQueuedCount,
  };
}
