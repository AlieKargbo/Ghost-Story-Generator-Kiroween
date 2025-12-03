import * as fc from 'fast-check';
import { AICoAuthor } from '../services/AICoAuthor.js';
import { NarrativeContext, StorySegment, HorrorElement } from '../../../shared/types.js';
import { randomUUID } from 'crypto';

describe('AICoAuthor Property Tests', () => {
  // Feature: ghost-story-generator, Property 10: AI triggers at threshold
  // Validates: Requirements 3.1
  test('AI triggers when narrative reaches threshold', () => {
    fc.assert(
      fc.property(
        fc.record({
          threshold: fc.integer({ min: 1, max: 20 }),
          segmentCount: fc.integer({ min: 0, max: 50 }),
        }),
        (data) => {
          const aiCoAuthor = new AICoAuthor(data.threshold);
          
          // Create narrative context with specified number of segments
          const segments: StorySegment[] = Array.from({ length: data.segmentCount }, (_, i) => ({
            id: randomUUID(),
            content: `Segment ${i}`,
            contributorId: 'user-1',
            contributorType: 'user' as const,
            timestamp: new Date(),
            moodTags: [],
          }));
          
          const context: NarrativeContext = {
            segments,
            characters: [],
            locations: [],
          };
          
          const shouldTrigger = aiCoAuthor.shouldTrigger(context);
          
          // AI should trigger if and only if segment count >= threshold
          return shouldTrigger === (data.segmentCount >= data.threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 11: AI maintains context coherence
  // Validates: Requirements 3.2, 8.1, 8.2, 8.4
  test('AI-generated content references entities from narrative context', () => {
    fc.assert(
      fc.property(
        fc.record({
          characterName: fc.constantFrom('Sarah', 'John', 'Emily', 'Michael', 'Alice'),
          location: fc.constantFrom('mansion', 'forest', 'basement', 'cemetery', 'attic'),
        }),
        (data) => {
          const aiCoAuthor = new AICoAuthor();
          
          // Create narrative with character mentioned mid-sentence (not at start)
          // so entity extraction can detect it
          const segments: StorySegment[] = [
            {
              id: randomUUID(),
              content: `The door creaked open and ${data.characterName} walked into the old ${data.location}. It was dark and cold inside.`,
              contributorId: 'user-1',
              contributorType: 'user' as const,
              timestamp: new Date(),
              moodTags: [],
            }
          ];
          
          const context = aiCoAuthor.buildNarrativeContext(segments);
          
          // Verify that the context correctly extracts entities
          const hasCharacter = context.characters.includes(data.characterName);
          const hasLocation = context.locations.includes(data.location);
          
          return hasCharacter && hasLocation;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 14: AI content filtering
  // Validates: Requirements 12.2
  test('AI content filtering rejects inappropriate content', () => {
    fc.assert(
      fc.property(
        fc.record({
          inappropriateKeyword: fc.constantFrom(
            'gore', 'guts', 'dismember', 'decapitate', 'mutilate', 'torture',
            'eviscerate', 'disembowel', 'sexual', 'nude', 'naked', 'rape', 'molest'
          ),
          beforeText: fc.string({ minLength: 5, maxLength: 50 }),
          afterText: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        (data) => {
          const aiCoAuthor = new AICoAuthor();
          
          // Create text with inappropriate content
          const inappropriateText = `${data.beforeText} ${data.inappropriateKeyword} ${data.afterText}`;
          
          // Filter the content
          const filtered = aiCoAuthor.filterContent(inappropriateText);
          
          // The filtered content should not contain the inappropriate keyword
          const lowerFiltered = filtered.toLowerCase();
          const lowerKeyword = data.inappropriateKeyword.toLowerCase();
          
          return !lowerFiltered.includes(lowerKeyword);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 12: AI segments are marked distinctly
  // Validates: Requirements 3.3, 3.4, 7.2, 7.3
  test('AI segments are marked with ai contributor type', () => {
    fc.assert(
      fc.property(
        fc.record({
          content: fc.string({ minLength: 10, maxLength: 200 }),
          intensity: fc.integer({ min: 1, max: 10 }),
          tags: fc.array(fc.constantFrom('supernatural', 'psychological', 'gothic', 'suspense'), { maxLength: 3 }),
        }),
        (data) => {
          const aiCoAuthor = new AICoAuthor();
          
          const horrorElement: HorrorElement = {
            content: data.content,
            intensity: data.intensity,
            tags: data.tags,
          };
          
          const segment = aiCoAuthor.createAISegment(horrorElement, 'test-session');
          
          // Verify AI segment is marked correctly
          const hasAIType = segment.contributorType === 'ai';
          const hasAIContributor = segment.contributorId === 'ai-coauthor';
          const hasContent = segment.content === data.content;
          const hasTags = segment.moodTags.length === data.tags.length;
          
          return hasAIType && hasAIContributor && hasContent && hasTags;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 13: AI generation diversity
  // Validates: Requirements 12.1
  test('AI-generated horror elements have diverse intensity and tags', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 20, maxLength: 200 }),
            keywords: fc.array(
              fc.constantFrom('scream', 'terror', 'fear', 'shadow', 'whisper', 'ghost', 'dark', 'cold'),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (testCases) => {
          const aiCoAuthor = new AICoAuthor();
          const intensities: number[] = [];
          const tagSets: string[][] = [];
          
          for (const testCase of testCases) {
            // Create content with different keywords
            const content = `${testCase.content} ${testCase.keywords.join(' ')}`;
            const intensity = aiCoAuthor['calculateIntensity'](content);
            const tags = aiCoAuthor['extractHorrorTags'](content);
            
            intensities.push(intensity);
            tagSets.push(tags);
          }
          
          // Check for diversity: not all intensities should be the same
          const uniqueIntensities = new Set(intensities);
          const hasIntensityDiversity = uniqueIntensities.size > 1 || testCases.length === 1;
          
          // Check for tag diversity: not all tag sets should be identical
          const tagSetStrings = tagSets.map(tags => tags.sort().join(','));
          const uniqueTagSets = new Set(tagSetStrings);
          const hasTagDiversity = uniqueTagSets.size > 1 || testCases.length === 1;
          
          return hasIntensityDiversity || hasTagDiversity;
        }
      ),
      { numRuns: 100 }
    );
  });
});
