import React from 'react';

interface AudioErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

/**
 * Fallback UI for audio failures
 * Provides user-friendly message and retry option
 */
function AudioErrorFallback({ error, onRetry }: AudioErrorFallbackProps) {
  return (
    <div className="audio-error-fallback">
      <div className="audio-error-content">
        <span className="audio-error-icon">🔇</span>
        <h3>Audio Unavailable</h3>
        <p>
          We couldn't initialize the audio system. You can continue without audio,
          or try enabling it again.
        </p>
        {error && (
          <details className="error-details">
            <summary>Technical details</summary>
            <pre>{error.message}</pre>
          </details>
        )}
        {onRetry && (
          <button onClick={onRetry} className="btn-retry">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export default AudioErrorFallback;
