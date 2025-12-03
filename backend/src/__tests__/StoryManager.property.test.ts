import * as fc from 'fast-check';
import { StoryManager } from '../services/StoryManager.js';
import { StorySegment } from '../../../shared/types.js';
import { randomUUID } from 'crypto';

describe('StoryManager Property Tests', () => {
  // Feature: ghost-story-generator, Property 1: Session creation produces unique identifiers
  // Validates: Requirements 1.1
  test('session IDs are always unique', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            prompt: fc.option(fc.string({ maxLength: 500 })),
          }),
          { minLength: 2, maxLength: 100 }
        ),
        (sessionRequests) => {
          const storyManager = new StoryManager();
          const ids = sessionRequests.map((req) =>
            storyManager.createSession(req.title, req.prompt ?? undefined).id
          );
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 2: New sessions initialize with empty narrative
  // Validates: Requirements 1.2
  test('new sessions always have empty narrative', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          prompt: fc.option(fc.string({ maxLength: 500 })),
        }),
        (sessionRequest) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(
            sessionRequest.title,
            sessionRequest.prompt ?? undefined
          );
          return session.segments.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 3: Session data round-trip preservation
  // Validates: Requirements 1.3, 5.5
  test('session data is preserved on round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          prompt: fc.option(fc.string({ maxLength: 500 })),
        }),
        (sessionRequest) => {
          const storyManager = new StoryManager();
          const created = storyManager.createSession(
            sessionRequest.title,
            sessionRequest.prompt ?? undefined
          );
          const retrieved = storyManager.getSession(created.id);
          
          return (
            retrieved !== undefined &&
            retrieved.id === created.id &&
            retrieved.title === created.title &&
            retrieved.startingPrompt === created.startingPrompt
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 5: Segment addition grows narrative
  // Validates: Requirements 2.1
  test('adding a segment increases narrative length by one', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          segmentContent: fc.string({ minLength: 1, maxLength: 500 }),
          contributorId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (data) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(data.title);
          const initialLength = session.segments.length;
          
          const segment: StorySegment = {
            id: randomUUID(),
            content: data.segmentContent,
            contributorId: data.contributorId,
            contributorType: 'user',
            timestamp: new Date(),
            moodTags: [],
          };
          
          storyManager.addSegment(session.id, segment);
          const updatedSession = storyManager.getSession(session.id);
          
          return updatedSession !== undefined && 
                 updatedSession.segments.length === initialLength + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 9: Chronological ordering invariant
  // Validates: Requirements 6.5, 7.5
  test('segments are always in chronological order', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          segments: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 500 }),
              contributorId: fc.string({ minLength: 1, maxLength: 50 }),
              timestamp: fc.date(),
            }),
            { minLength: 2, maxLength: 20 }
          ),
        }),
        (data) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(data.title);
          
          // Add segments in random order
          for (const segData of data.segments) {
            const segment: StorySegment = {
              id: randomUUID(),
              content: segData.content,
              contributorId: segData.contributorId,
              contributorType: 'user',
              timestamp: segData.timestamp,
              moodTags: [],
            };
            storyManager.addSegment(session.id, segment);
          }
          
          const retrievedSegments = storyManager.getSegments(session.id);
          
          // Check if segments are in chronological order
          for (let i = 1; i < retrievedSegments.length; i++) {
            if (retrievedSegments[i].timestamp < retrievedSegments[i - 1].timestamp) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 28: Export includes all segments
  // Validates: Requirements 10.1
  test('export includes all segments', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          segments: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 500 }),
              contributorId: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        (data) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(data.title);
          
          // Add segments
          for (const segData of data.segments) {
            const segment: StorySegment = {
              id: randomUUID(),
              content: segData.content,
              contributorId: segData.contributorId,
              contributorType: 'user',
              timestamp: new Date(),
              moodTags: [],
            };
            storyManager.addSegment(session.id, segment);
          }
          
          const exportedText = storyManager.exportSession(session.id, 'text');
          
          // Check that all segment contents appear in the export
          return data.segments.every(seg => exportedText.includes(seg.content));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 29: Export includes metadata
  // Validates: Requirements 10.2, 10.5
  test('export includes metadata (title, timestamp, attributions)', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          segments: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 500 }),
              contributorId: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (data) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(data.title);
          
          // Add segments
          for (const segData of data.segments) {
            const segment: StorySegment = {
              id: randomUUID(),
              content: segData.content,
              contributorId: segData.contributorId,
              contributorType: 'user',
              timestamp: new Date(),
              moodTags: [],
            };
            storyManager.addSegment(session.id, segment);
          }
          
          const exportedText = storyManager.exportSession(session.id, 'text');
          
          // Check for title
          const hasTitle = exportedText.includes(data.title);
          
          // Check for timestamp (should contain "Created:")
          const hasTimestamp = exportedText.includes('Created:');
          
          // Check for contributor attributions
          const hasAttributions = data.segments.every(seg => 
            exportedText.includes(seg.contributorId)
          );
          
          return hasTitle && hasTimestamp && hasAttributions;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 30: Export format support
  // Validates: Requirements 10.4
  test('export supports both text and HTML formats', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        (data) => {
          const storyManager = new StoryManager();
          const session = storyManager.createSession(data.title);
          
          const segment: StorySegment = {
            id: randomUUID(),
            content: data.content,
            contributorId: 'test-user',
            contributorType: 'user',
            timestamp: new Date(),
            moodTags: [],
          };
          storyManager.addSegment(session.id, segment);
          
          const textExport = storyManager.exportSession(session.id, 'text');
          const htmlExport = storyManager.exportSession(session.id, 'html');
          
          // Text export should be plain text (no HTML tags)
          const textIsPlain = !textExport.includes('<html>') && 
                              textExport.includes(data.content);
          
          // HTML export should contain HTML tags and content
          const htmlIsValid = htmlExport.includes('<html>') && 
                              htmlExport.includes('<body>') &&
                              htmlExport.includes(data.content);
          
          return textIsPlain && htmlIsValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});
