/**
 * Offline Queue Utility for Client-Side
 * 
 * Manages queuing of story segments when the client is offline
 * and syncs them when connection is restored.
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
  private storageKey = 'ghost-story-offline-queue';

  constructor() {
    // Load queue from localStorage on initialization
    this.loadFromStorage();
  }

  /**
   * Add a segment to the offline queue
   */
  enqueue(sessionId: string, content: string): void {
    const queuedSegment: QueuedSegment = {
      sessionId,
      content,
      timestamp: new Date(),
      retryCount: 0,
    };
    
    this.queue.push(queuedSegment);
    this.saveToStorage();
  }

  /**
   * Get all queued segments for a session
   */
  getQueuedSegments(sessionId: string): QueuedSegment[] {
    return this.queue.filter((item) => item.sessionId === sessionId);
  }

  /**
   * Get all queued segments
   */
  getAllQueued(): QueuedSegment[] {
    return [...this.queue];
  }

  /**
   * Remove a segment from the queue after successful sync
   */
  dequeue(sessionId: string, timestamp: Date): void {
    this.queue = this.queue.filter(
      (item) => !(item.sessionId === sessionId && item.timestamp.getTime() === timestamp.getTime())
    );
    this.saveToStorage();
  }

  /**
   * Increment retry count for a segment
   * Returns false if max retries exceeded and item was removed
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
      
      this.saveToStorage();
      return true;
    }

    return false;
  }

  /**
   * Clear all queued segments for a session
   */
  clearSession(sessionId: string): void {
    this.queue = this.queue.filter((item) => item.sessionId !== sessionId);
    this.saveToStorage();
  }

  /**
   * Clear all queued segments
   */
  clearAll(): void {
    this.queue = [];
    this.saveToStorage();
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

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.queue);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Convert timestamp strings back to Date objects
        this.queue = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }
}
