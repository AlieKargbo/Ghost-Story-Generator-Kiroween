import { useEffect, useRef, useMemo, useState } from 'react';
import type { StorySegment as StorySegmentType } from '../../../shared/types';
import { useSessionStore } from '../store/sessionStore';
import StorySegment from './StorySegment';
import LoadingIndicator from './LoadingIndicator';

interface NarrativeViewProps {
  segments: StorySegmentType[];
}

function NarrativeView({ segments }: NarrativeViewProps) {
  const narrativeEndRef = useRef<HTMLDivElement>(null);
  const optimisticSegments = useSessionStore((state) => state.optimisticSegments);
  const [showAILoading, setShowAILoading] = useState(false);
  const previousSegmentCount = useRef(segments.length);

  // Combine real and optimistic segments
  const allSegments = useMemo(() => {
    const optimisticArray = Array.from(optimisticSegments.values());
    return [...segments, ...optimisticArray];
  }, [segments, optimisticSegments]);

  // Check if AI might be generating (every 3-5 segments)
  useEffect(() => {
    const currentCount = segments.length;
    const userSegments = segments.filter(s => s.contributorType === 'user').length;
    
    // Show AI loading indicator if we're at a threshold (every 3 user segments)
    if (userSegments > 0 && userSegments % 3 === 0 && currentCount === previousSegmentCount.current) {
      setShowAILoading(true);
      
      // Hide after 5 seconds if no new segment
      const timeout = setTimeout(() => setShowAILoading(false), 5000);
      return () => clearTimeout(timeout);
    } else if (currentCount > previousSegmentCount.current) {
      setShowAILoading(false);
      previousSegmentCount.current = currentCount;
    }
  }, [segments]);

  // Auto-scroll to bottom when new segments are added
  useEffect(() => {
    narrativeEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allSegments]);

  // Sort segments chronologically
  const sortedSegments = [...allSegments].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="narrative-view">
      {sortedSegments.length === 0 ? (
        <div className="empty-narrative">
          <p>The story begins here... Add the first segment to start your tale.</p>
        </div>
      ) : (
        <div className="segments-container">
          {sortedSegments.map((segment) => {
            const isOptimistic = optimisticSegments.has(segment.id);
            return (
              <StorySegment 
                key={segment.id} 
                segment={segment} 
                isOptimistic={isOptimistic}
              />
            );
          })}
          {showAILoading && (
            <div className="ai-loading">
              <LoadingIndicator 
                message="AI is crafting a horror element..." 
                size="small" 
                inline 
              />
            </div>
          )}
          <div ref={narrativeEndRef} />
        </div>
      )}
    </div>
  );
}

export default NarrativeView;
