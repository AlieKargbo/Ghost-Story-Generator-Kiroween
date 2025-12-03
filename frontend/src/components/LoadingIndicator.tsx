import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  inline?: boolean;
}

/**
 * Loading Indicator Component
 * Shows a spinner with optional message
 */
function LoadingIndicator({ 
  message = 'Loading...', 
  size = 'medium',
  inline = false 
}: LoadingIndicatorProps) {
  return (
    <div className={`loading-indicator ${inline ? 'inline' : ''} ${size}`}>
      <div className="spinner" />
      {message && <span className="loading-message">{message}</span>}
    </div>
  );
}

export default LoadingIndicator;
