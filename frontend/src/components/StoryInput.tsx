import React, { useState, useEffect, type KeyboardEvent } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../store/sessionStore';
import { retryWithBackoff, getUserFriendlyMessage } from '../utils/errorHandling';
import { validateSegment, getCharacterCountStatus } from '../utils/validation';

interface StoryInputProps {
  sessionId: string;
  onSubmit?: (content: string) => void;
}

const MAX_LENGTH = 500;

// Simple UUID generator for browser
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function StoryInput({ sessionId, onSubmit }: StoryInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { addSegment } = useWebSocket();
  const addOptimisticSegment = useSessionStore((state) => state.addOptimisticSegment);
  const removeOptimisticSegment = useSessionStore((state) => state.removeOptimisticSegment);
  const currentSession = useSessionStore((state) => state.currentSession);

  // Real-time validation as user types
  useEffect(() => {
    if (!content) {
      setValidationError(null);
      setWarning(null);
      return;
    }

    const validation = validateSegment(content);
    
    if (!validation.valid && validation.error) {
      setValidationError(validation.error);
      setWarning(null);
    } else {
      setValidationError(null);
      setWarning(validation.warning || null);
    }
  }, [content]);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    // Validate before submission
    const validation = validateSegment(trimmedContent);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationError(null);
    setWarning(null);

    // Create optimistic segment
    const optimisticSegment = {
      id: generateUUID(),
      content: trimmedContent,
      contributorId: currentSession?.participants[currentSession.participants.length - 1]?.id || 'unknown',
      contributorType: 'user' as const,
      timestamp: new Date(),
      moodTags: [],
    };

    // Add optimistic segment to UI immediately
    addOptimisticSegment(optimisticSegment);

    // Clear input immediately for better UX
    setContent('');

    try {
      // Submit via WebSocket with retry logic
      await retryWithBackoff(
        () => addSegment(sessionId, trimmedContent),
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoff: true,
          onRetry: (attempt, err) => {
            console.log(`Retry attempt ${attempt} after error:`, err.message);
          },
        }
      );

      // Call optional callback
      if (onSubmit) {
        onSubmit(trimmedContent);
      }

      // Remove optimistic segment (real one will be added via WebSocket event)
      removeOptimisticSegment(optimisticSegment.id);
    } catch (err) {
      console.error('Failed to submit segment:', err);
      
      // Remove optimistic segment on error
      removeOptimisticSegment(optimisticSegment.id);
      
      // Restore content so user can retry
      setContent(trimmedContent);
      
      // Show user-friendly error message
      const errorMessage = getUserFriendlyMessage(err as Error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remainingChars = MAX_LENGTH - content.length;
  const charCountStatus = getCharacterCountStatus(content.length, MAX_LENGTH);

  return (
    <div className="story-input">
      {error && (
        <div className="message error-message">
          <span className="message-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="message-dismiss" 
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {validationError && !error && (
        <div className="message validation-error">
          <span className="message-icon">❌</span>
          <span>{validationError}</span>
        </div>
      )}
      {warning && !error && !validationError && (
        <div className="message warning-message">
          <span className="message-icon">💡</span>
          <span>{warning}</span>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add your contribution to the story... (Press Enter to submit, Shift+Enter for new line)"
        maxLength={MAX_LENGTH}
        rows={4}
        disabled={isSubmitting}
        className={`story-textarea ${validationError ? 'has-error' : ''}`}
      />
      <div className="input-footer">
        <span className={`char-count ${charCountStatus}`}>
          {remainingChars} characters remaining
        </span>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !content.trim() || !!validationError} 
          className="btn-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Add to Story'}
        </button>
      </div>
    </div>
  );
}

export default StoryInput;
