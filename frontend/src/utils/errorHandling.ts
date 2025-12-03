/**
 * Error Handling Utilities
 * Provides retry mechanisms and error classification
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUDIO = 'audio',
  WEBSOCKET = 'websocket',
  UNKNOWN = 'unknown',
}

/**
 * Classify an error by type
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return ErrorType.NETWORK;
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('profanity')
  ) {
    return ErrorType.VALIDATION;
  }

  if (
    message.includes('audio') ||
    message.includes('audiocontext') ||
    message.includes('tone')
  ) {
    return ErrorType.AUDIO;
  }

  if (
    message.includes('websocket') ||
    message.includes('socket') ||
    message.includes('disconnected')
  ) {
    return ErrorType.WEBSOCKET;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  const errorType = classifyError(error);

  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Network connection issue. Please check your internet connection and try again.';
    
    case ErrorType.VALIDATION:
      return 'Your input contains invalid content. Please review and try again.';
    
    case ErrorType.AUDIO:
      return 'Audio system error. You can continue without audio or try refreshing the page.';
    
    case ErrorType.WEBSOCKET:
      return 'Connection to server lost. Attempting to reconnect...';
    
    case ErrorType.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const errorType = classifyError(error);
  
  // Network and WebSocket errors are typically retryable
  return errorType === ErrorType.NETWORK || errorType === ErrorType.WEBSOCKET;
}
