import React from 'react';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import StorySegment from '../components/StorySegment';
import type { StorySegment as StorySegmentType } from '../../../shared/types';

// Feature: ghost-story-generator, Property 27: Segments display contributor information
describe('StorySegment Property Tests', () => {
  test('Property 27: all segments display contributor information', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          contributorId: fc.string({ minLength: 1, maxLength: 50 }),
          contributorType: fc.constantFrom('user' as const, 'ai' as const),
          timestamp: fc.date(),
          moodTags: fc.array(fc.string()),
        }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (segment: StorySegmentType, contributorName: string | undefined) => {
          const { container } = render(
            <StorySegment segment={segment} contributorName={contributorName} />
          );

          // Check that contributor information is displayed
          const contributorElement = container.querySelector('.contributor-name');
          expect(contributorElement).toBeTruthy();
          expect(contributorElement?.textContent).toBeTruthy();

          // Verify the correct contributor name is shown
          if (segment.contributorType === 'ai') {
            expect(contributorElement?.textContent).toBe('AI Co-Author');
          } else {
            const expectedName = contributorName || segment.contributorId;
            expect(contributorElement?.textContent).toBe(expectedName);
          }

          // Verify content is displayed
          const contentElement = container.querySelector('.segment-content');
          expect(contentElement).toBeTruthy();
          expect(contentElement?.textContent).toBe(segment.content);
        }
      ),
      { numRuns: 100 }
    );
  });
});
