/**
 * Reconnection Manager with Exponential Backoff
 * 
 * Manages WebSocket reconnection attempts with exponential backoff strategy
 */

export class ReconnectionManager {
  private attempt = 0;
  private maxAttempts = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Calculate the next delay using exponential backoff with jitter
   */
  getNextDelay(): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, this.attempt);
    
    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add jitter (random variation of ±25%) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(0, cappedDelay + jitter);
    
    this.attempt++;
    return delay;
  }

  /**
   * Reset the reconnection attempt counter
   */
  reset(): void {
    this.attempt = 0;
    this.clearTimer();
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

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect(callback: () => void): void {
    this.clearTimer();
    
    if (this.isMaxAttemptsReached()) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.getNextDelay();
    console.log(`Scheduling reconnection attempt ${this.attempt} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      callback();
    }, delay);
  }

  /**
   * Clear any pending reconnection timer
   */
  clearTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get the maximum number of attempts
   */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}
