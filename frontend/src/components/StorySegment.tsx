import React, { useState } from 'react';
import type { StorySegment as StorySegmentType } from '../../../shared/types';

interface StorySegmentProps {
  segment: StorySegmentType;
  contributorName?: string;
  isOptimistic?: boolean;
}

function StorySegment({ segment, contributorName, isOptimistic = false }: StorySegmentProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAI = segment.contributorType === 'ai';
  const displayName = isAI ? 'AI Co-Author' : contributorName || segment.contributorId;

  return (
    <div
      className={`story-segment ${isAI ? 'ai-segment' : 'user-segment'} ${isOptimistic ? 'optimistic' : ''}`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className="segment-header">
        <span className="contributor-name">
          {displayName}
          {isOptimistic && <span className="optimistic-indicator"> (sending...)</span>}
        </span>
        {showTimestamp && <span className="timestamp">{formatTimestamp(segment.timestamp)}</span>}
      </div>
      <p className="segment-content">{segment.content}</p>
    </div>
  );
}

export default StorySegment;
