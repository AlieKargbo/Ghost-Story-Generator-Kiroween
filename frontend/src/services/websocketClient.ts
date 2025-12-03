/**
 * WebSocket Client Service with Offline Queue and Reconnection Support
 * 
 * Manages WebSocket connection to the server with automatic reconnection
 * and offline queue for segments added while disconnected.
 */

import { io, Socket } from 'socket.io-client';
import { OfflineQueue } from './offlineQueue';
import { ReconnectionManager } from './reconnectionManager';
// Types will be used in task 10
// import type { StorySession, StorySegment, Participant } from '../../../shared/types';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketClientOptions {
  url?: string;
  autoConnect?: boolean;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private offlineQueue: OfflineQueue;
  private reconnectionManager: ReconnectionManager;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private currentSessionId: string | null = null;
  private currentParticipantId: string | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private url: string;

  constructor(options: WebSocketClientOptions = {}) {
    this.url = options.url || 'http://localhost:3000';
    this.offlineQueue = new OfflineQueue();
    this.reconnectionManager = new ReconnectionManager();

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.url, {
      autoConnect: true,
      reconnection: false, // We handle reconnection manually
    });

    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.setConnectionStatus('connected');
      this.reconnectionManager.reset();

      // If we were in a session, reconnect to it
      if (this.currentSessionId && this.currentParticipantId) {
        this.reconnectToSession(this.currentSessionId, this.currentParticipantId);
      }

      // Sync offline queue
      this.syncOfflineQueue();
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.setConnectionStatus('disconnected');

      // Attempt reconnection if not a manual disconnect
      if (reason !== 'io client disconnect') {
        this.attemptReconnection();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.setConnectionStatus('disconnected');
      this.attemptReconnection();
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectionManager.isMaxAttemptsReached()) {
      console.error('Max reconnection attempts reached. Please refresh the page.');
      return;
    }

    this.setConnectionStatus('reconnecting');

    this.reconnectionManager.scheduleReconnect(() => {
      console.log('Attempting to reconnect...');
      this.socket?.connect();
    });
  }

  /**
   * Reconnect to a session after connection is restored
   */
  private reconnectToSession(sessionId: string, participantId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('session:reconnect', { sessionId, participantId });
  }

  /**
   * Sync offline queue - send all queued segments
   */
  private async syncOfflineQueue(): Promise<void> {
    if (this.offlineQueue.isEmpty()) {
      return;
    }

    console.log(`Syncing ${this.offlineQueue.size()} queued segments...`);

    const queuedSegments = this.offlineQueue.getAllQueued();

    for (const queuedSegment of queuedSegments) {
      try {
        // Attempt to send the segment
        await this.sendSegment(queuedSegment.sessionId, queuedSegment.content);
        
        // If successful, remove from queue
        this.offlineQueue.dequeue(queuedSegment.sessionId, queuedSegment.timestamp);
        console.log('Successfully synced queued segment');
      } catch (error) {
        console.error('Failed to sync queued segment:', error);
        
        // Increment retry count
        const shouldRetry = this.offlineQueue.incrementRetry(
          queuedSegment.sessionId,
          queuedSegment.timestamp
        );
        
        if (!shouldRetry) {
          console.error('Max retries exceeded for segment, removing from queue');
        }
      }
    }
  }

  /**
   * Create a new story session
   */
  createSession(title: string, userName: string, startingPrompt?: string): void {
    if (!this.socket?.connected) {
      throw new Error('Cannot create session while disconnected');
    }

    this.socket.emit('session:create', { title, startingPrompt, userName });
  }

  /**
   * Join an existing story session
   */
  joinSession(sessionId: string, userName: string): void {
    if (!this.socket?.connected) {
      throw new Error('Cannot join session while disconnected');
    }

    this.currentSessionId = sessionId;
    this.socket.emit('session:join', { sessionId, userName });
  }

  /**
   * Add a segment to the story
   * If offline, queues the segment for later sync
   */
  addSegment(sessionId: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        // Queue for offline sync
        console.log('Offline: queuing segment for later sync');
        this.offlineQueue.enqueue(sessionId, content);
        resolve();
        return;
      }

      this.sendSegment(sessionId, content)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Send a segment to the server
   */
  private sendSegment(sessionId: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected'));
        return;
      }

      // Set up one-time error listener for this specific request
      const errorHandler = (error: { message: string; code: string }) => {
        if (error.code === 'SEGMENT_ADD_ERROR' || error.code === 'CONTENT_VALIDATION_ERROR') {
          this.socket?.off('error', errorHandler);
          reject(new Error(error.message));
        }
      };

      this.socket.on('error', errorHandler);

      // Send the segment
      this.socket.emit('segment:add', { sessionId, content });

      // Resolve after a short delay (assuming success if no error)
      setTimeout(() => {
        this.socket?.off('error', errorHandler);
        resolve();
      }, 100);
    });
  }

  /**
   * Export a session
   */
  exportSession(sessionId: string, format: 'text' | 'html'): void {
    if (!this.socket?.connected) {
      throw new Error('Cannot export session while disconnected');
    }

    this.socket.emit('session:export', { sessionId, format });
  }

  /**
   * Generate an invite link
   */
  generateInviteLink(sessionId: string, baseUrl?: string): void {
    if (!this.socket?.connected) {
      throw new Error('Cannot generate invite link while disconnected');
    }

    this.socket.emit('invite:generate', { sessionId, baseUrl });
  }

  /**
   * Register event listeners
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Unregister event listeners
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Register a connection status listener
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the number of queued segments
   */
  getQueuedCount(): number {
    return this.offlineQueue.size();
  }

  /**
   * Set current session and participant IDs for reconnection
   */
  setSessionContext(sessionId: string, participantId: string): void {
    this.currentSessionId = sessionId;
    this.currentParticipantId = participantId;
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.reconnectionManager.clearTimer();
    this.socket?.disconnect();
    this.setConnectionStatus('disconnected');
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.reconnectionManager.reset();
    this.socket?.connect();
  }
}
