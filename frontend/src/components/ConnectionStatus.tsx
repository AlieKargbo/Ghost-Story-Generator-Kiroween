import React from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Connection Status Indicator
 * Shows current connection state and queued items
 */
function ConnectionStatus() {
  const isConnected = useSessionStore((state) => state.isConnected);
  const isOffline = useSessionStore((state) => state.isOffline);
  const { getQueuedCount, getConnectionStatus } = useWebSocket();

  const queuedCount = getQueuedCount();
  const status = getConnectionStatus();

  if (isConnected && !isOffline) {
    return (
      <div className="connection-status connected">
        <span className="status-dot" />
        <span>Connected</span>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div className="connection-status reconnecting">
        <span className="status-dot" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="connection-status disconnected">
      <span className="status-dot" />
      <span>Offline</span>
      {queuedCount > 0 && (
        <span className="queued-count">({queuedCount} queued)</span>
      )}
    </div>
  );
}

export default ConnectionStatus;
