import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { audioEngine } from '../services/AudioEngine';
import NarrativeView from '../components/NarrativeView';
import StoryInput from '../components/StoryInput';
import ParticipantList from '../components/ParticipantList';
import AudioControls from '../components/AudioControls';
import ExportButton from '../components/ExportButton';
import AudioErrorFallback from '../components/AudioErrorFallback';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingIndicator from '../components/LoadingIndicator';

function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const currentSession = useSessionStore((state) => state.currentSession);
  const isOffline = useSessionStore((state) => state.isOffline);
  const { getQueuedCount, joinSession } = useWebSocket();

  // ALL useState hooks MUST be called unconditionally
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [audioError, setAudioError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);

  // ALL useRef hooks MUST be called unconditionally
  const previousSegmentCount = useRef(0);
  const hasAttemptedReconnect = useRef(false);

  // ALL useEffect hooks MUST be called unconditionally
  // Session restoration logic
  useEffect(() => {
    if (!sessionId) {
      console.error('No session ID in URL');
      navigate('/');
      return;
    }

    // Check if we have this session in our store
    const storedSession = useSessionStore.getState().currentSession;
    
    if (!storedSession || storedSession.id !== sessionId) {
      // We don't have this session - need to join it
      if (!hasAttemptedReconnect.current) {
        console.log('Session not found in store, attempting to join:', sessionId);
        
        // Prompt for name if joining a session we don't have
        const userName = prompt('Enter your name to join this session:');
        if (!userName) {
          navigate('/');
          return;
        }
        
        hasAttemptedReconnect.current = true;
        joinSession(sessionId, userName);
        
        // Give it time to load
        const checkTimer = setTimeout(() => {
          setIsLoading(false);
          if (!useSessionStore.getState().currentSession) {
            setSessionNotFound(true);
          }
        }, 2000);

        return () => clearTimeout(checkTimer);
      }
    } else {
      // We have the session in store
      console.log('Session found in store:', sessionId);
      setIsLoading(false);
    }
  }, [sessionId, navigate, joinSession]);

  // Initialize audio engine when session loads
  useEffect(() => {
    if (currentSession && !audioInitialized) {
      // Try to initialize audio engine
      initializeAudio();
    }
  }, [currentSession, audioInitialized]);

  // Subscribe audio engine to story events (segment additions)
  useEffect(() => {
    if (!currentSession || !audioInitialized) return;

    // Check if new segments have been added
    const currentSegmentCount = currentSession.segments.length;

    if (currentSegmentCount > previousSegmentCount.current) {
      // Get the newly added segments
      const newSegments = currentSession.segments.slice(previousSegmentCount.current);

      // Process each new segment through the audio engine
      newSegments.forEach(segment => {
        audioEngine.onSegmentAdded(segment.content);
      });

      // Update the previous count
      previousSegmentCount.current = currentSegmentCount;
    }
  }, [currentSession?.segments, audioInitialized]);

  //AI takeover sound effect - MUST BE BEFORE ANY RETURNS
    // In SessionView.tsx, when AI segment is added:
  useEffect(() => {
    if (!currentSession || !audioInitialized) return;

    const lastSegment = currentSession.segments[currentSession.segments.length - 1];
    if (lastSegment?.contributorType === 'ai') {
      // Check if this is a new AI segment we haven't seen before
      const lastAITimestamp = lastSegment.timestamp;
      const previousLastSegment = currentSession.segments[currentSession.segments.length - 2];
      
      // Only play sound for newly added AI segments
      if (!previousLastSegment || lastAITimestamp !== previousLastSegment.timestamp) {
        setTimeout(() => {
          // Check if playAITakeoverSound exists, if not use whisper
          if (typeof audioEngine.playAITakeoverSound === 'function') {
            audioEngine.playAITakeoverSound();
          } else {
            audioEngine.triggerEffect('whisper');
          }
        }, 300);
      }
    }
  }, [currentSession?.segments, audioInitialized]);
   // ========================================
  // END OF HOOKS - NOW SAFE TO RETURN EARLY
  // ========================================

  const initializeAudio = async () => {
    try {
      // Check if already initialized
      if (audioEngine.isInitialized()) {
        setAudioInitialized(true);
        setAudioError(null);
        return;
      }

      // Initialize the audio engine
      await audioEngine.initialize();

      // Try to resume context (may require user interaction)
      await audioEngine.resumeContext();

      // Start with default ambient sounds
      audioEngine.updateSoundscape(['calm']);

      setAudioInitialized(true);
      setAudioError(null);
      console.log('Audio engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      setAudioError(error as Error);
      // Show prompt for user interaction if autoplay is blocked
      setShowAudioPrompt(true);
    }
  };

  const handleUserInteraction = async () => {
    try {
      await audioEngine.resumeContext();
      audioEngine.updateSoundscape(['calm']);
      setShowAudioPrompt(false);
      setAudioInitialized(true);
      setAudioError(null);
    } catch (error) {
      console.error('Failed to resume audio context:', error);
      setAudioError(error as Error);
    }
  };

  const handleAudioRetry = async () => {
    setAudioError(null);
    setShowAudioPrompt(false);
    await initializeAudio();
  };

  // Conditional rendering AFTER all hooks
  if (isLoading) {
    return (
      <div className="loading-container">
        <LoadingIndicator message="Loading session..." size="large" />
      </div>
    );
  }

  if (sessionNotFound || !currentSession) {
    return (
      <div className="loading-container">
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>Session not found or failed to load.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const queuedCount = getQueuedCount();

  return (
    <div className="session-view">
      {showAudioPrompt && !audioError && (
        <div className="audio-prompt-banner">
          <span>🔊 Click to enable audio</span>
          <button onClick={handleUserInteraction}>Enable Audio</button>
        </div>
      )}
      {audioError && (
        <AudioErrorFallback error={audioError} onRetry={handleAudioRetry} />
      )}
      {isOffline && (
        <div className="offline-banner">
          <span>⚠️ You are offline. </span>
          {queuedCount > 0 && (
            <span>{queuedCount} segment(s) queued for sync.</span>
          )}
        </div>
      )}
      <header className="session-header">
        <div className="header-left">
          <h1>{currentSession.title}</h1>
          <ConnectionStatus />
        </div>
        <div className="session-controls">
          <AudioControls />
          <ExportButton />
        </div>
      </header>
      <div className="session-content">
        <div className="main-area">
          <NarrativeView segments={currentSession.segments} />
          <StoryInput sessionId={currentSession.id} />
        </div>
        <aside className="sidebar">
          <ParticipantList participants={currentSession.participants} />
        </aside>
      </div>
    </div>
  );
}

export default SessionView;
