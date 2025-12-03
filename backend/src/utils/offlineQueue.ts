/**
 * Offline Queue Utility
 * 
 * This is a reference implementation for client-side offline queue management.
 * The actual implementation should be done in the frontend.
 * 
 * This file serves as documentation for how the offline queue should work.
 */

export interface QueuedSegment {
  sessionId: string;
  content: string;
  timestamp: Date;
  retryCount: number;
}

export class OfflineQueue {
  private queue: QueuedSegment[] = [];
  private maxRetries = 3;

  /**
   * Add a segment to the offline queue
   */
  enqueue(sessionId: string, content: string): void {
    this.queue.push({
      sessionId,
      content,
      timestamp: new Date(),
      retryCount: 0,
    });
  }

  /**
   * Get all queued segments for a session
   */
  getQueuedSegments(sessionId: string): QueuedSegment[] {
    return this.queue.filter((item) => item.sessionId === sessionId);
  }

  /**
   * Remove a segment from the queue after successful sync
   */
  dequeue(sessionId: string, timestamp: Date): void {
    this.queue = this.queue.filter(
      (item) => !(item.sessionId === sessionId && item.timestamp.getTime() === timestamp.getTime())
    );
  }

  /**
   * Increment retry count for a segment
   */
  incrementRetry(sessionId: string, timestamp: Date): boolean {
    const item = this.queue.find(
      (item) => item.sessionId === sessionId && item.timestamp.getTime() === timestamp.getTime()
    );

    if (item) {
      item.retryCount++;
      
      // Remove if max retries exceeded
      if (item.retryCount >= this.maxRetries) {
        this.dequeue(sessionId, timestamp);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Clear all queued segments for a session
   */
  clearSession(sessionId: string): void {
    this.queue = this.queue.filter((item) => item.sessionId !== sessionId);
  }

  /**
   * Get the size of the queue
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

/**
 * Exponential backoff utility for reconnection attempts
 */
export class ReconnectionManager {
  private attempt = 0;
  private maxAttempts = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds

  /**
   * Calculate the next delay using exponential backoff
   */
  getNextDelay(): number {
    const delay = Math.min(this.baseDelay * Math.pow(2, this.attempt), this.maxDelay);
    this.attempt++;
    return delay;
  }

  /**
   * Reset the reconnection attempt counter
   */
  reset(): void {
    this.attempt = 0;
  }

  /**
   * Check if max attempts reached
   */
  isMaxAttemptsReached(): boolean {
    return this.attempt >= this.maxAttempts;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.attempt;
  }
}
