import { useParams } from 'react-router-dom';
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
  const currentSession = useSessionStore((state) => state.currentSession);
  const isOffline = useSessionStore((state) => state.isOffline);
  const { getQueuedCount } = useWebSocket();
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [audioError, setAudioError] = useState<Error | null>(null);
  const previousSegmentCount = useRef(0);

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

  useEffect(() => {
    // Session joining is handled by SessionCreate/SessionJoin components
    // This component just displays the session once it's loaded
  }, [sessionId]);

  if (!currentSession) {
    return (
      <div className="loading-container">
        <LoadingIndicator message="Loading session..." size="large" />
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
