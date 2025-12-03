import * as fc from 'fast-check';
import { StorySegment } from '../../../shared/types.js';
import { randomUUID } from 'crypto';

// Minimal AudioEngine interface for testing
// This will be replaced with the actual implementation in task 8.1-8.2
interface AudioEngine {
  analyzeMood(text: string): string[];
  onSegmentAdded?(segment: StorySegment): void;
  triggerEffect?(keyword: string): void;
}

// Mock AudioEngine implementation for testing
class MockAudioEngine implements AudioEngine {
  private analyzedSegments: StorySegment[] = [];
  private triggeredEffects: string[] = [];
  
  // Keywords that should trigger sound effects (from Requirements 4.2, 9.1)
  private readonly soundEffectKeywords = [
    'scream', 'screaming', 'screamed',
    'thunder', 'thundering', 'thundered',
    'creak', 'creaking', 'creaked',
    'whisper', 'whispering', 'whispered',
    'footsteps', 'footstep',
    'door', 'doors',
    'wind', 'windy',
    'howl', 'howling', 'howled',
    'crash', 'crashing', 'crashed',
    'bang', 'banging', 'banged',
    'rattle', 'rattling', 'rattled',
    'knock', 'knocking', 'knocked',
  ];
  
  analyzeMood(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Horror mood keywords
    if (lowerText.match(/\b(scream|terror|horrifying|nightmare|death|dead|corpse|ghost)\b/)) {
      tags.push('horror');
    }
    
    // Calm mood keywords
    if (lowerText.match(/\b(calm|peaceful|quiet|serene|gentle)\b/)) {
      tags.push('calm');
    }
    
    // Tense mood keywords
    if (lowerText.match(/\b(tense|anxious|nervous|worried|uneasy|suspense)\b/)) {
      tags.push('tense');
    }
    
    // Dark mood keywords
    if (lowerText.match(/\b(dark|darkness|shadow|night|black)\b/)) {
      tags.push('dark');
    }
    
    return tags;
  }
  
  triggerEffect(keyword: string): void {
    this.triggeredEffects.push(keyword);
  }
  
  detectAndTriggerKeywords(text: string): void {
    const lowerText = text.toLowerCase();
    
    // Check for each sound effect keyword
    for (const keyword of this.soundEffectKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText)) {
        this.triggerEffect(keyword);
      }
    }
  }
  
  onSegmentAdded(segment: StorySegment): void {
    // Track that this segment was analyzed
    this.analyzedSegments.push(segment);
    // Perform mood analysis
    this.analyzeMood(segment.content);
    // Detect and trigger sound effects for keywords
    this.detectAndTriggerKeywords(segment.content);
  }
  
  getAnalyzedSegments(): StorySegment[] {
    return this.analyzedSegments;
  }
  
  getTriggeredEffects(): string[] {
    return this.triggeredEffects;
  }
  
  reset(): void {
    this.analyzedSegments = [];
    this.triggeredEffects = [];
  }
}

describe('AudioEngine Property Tests', () => {
  // Feature: ghost-story-generator, Property 15: Audio analyzes all content changes
  // Validates: Requirements 2.5, 4.1
  test('audio engine analyzes mood for every segment added', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 10, maxLength: 200 }),
            contributorType: fc.constantFrom('user' as const, 'ai' as const),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (segmentData) => {
          const audioEngine = new MockAudioEngine();
          
          // Create segments from the generated data
          const segments: StorySegment[] = segmentData.map((data, index) => ({
            id: randomUUID(),
            content: data.content,
            contributorId: data.contributorType === 'ai' ? 'ai-coauthor' : `user-${index}`,
            contributorType: data.contributorType,
            timestamp: new Date(Date.now() + index * 1000),
            moodTags: [],
          }));
          
          // Simulate adding each segment to the narrative
          for (const segment of segments) {
            audioEngine.onSegmentAdded(segment);
          }
          
          // Property: The audio engine should have analyzed exactly as many segments as were added
          const analyzedSegments = audioEngine.getAnalyzedSegments();
          const allSegmentsAnalyzed = analyzedSegments.length === segments.length;
          
          // Property: Each segment should have been analyzed (verified by checking it's in the analyzed list)
          const allSegmentsPresent = segments.every(segment =>
            analyzedSegments.some(analyzed => analyzed.id === segment.id)
          );
          
          return allSegmentsAnalyzed && allSegmentsPresent;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify mood analysis produces tags for content with mood keywords
  test('mood analysis extracts tags from content with mood keywords', () => {
    fc.assert(
      fc.property(
        fc.record({
          moodKeyword: fc.constantFrom('scream', 'terror', 'calm', 'peaceful', 'tense', 'dark', 'shadow'),
          beforeText: fc.string({ minLength: 5, maxLength: 50 }),
          afterText: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        (data) => {
          const audioEngine = new MockAudioEngine();
          
          // Create content with a mood keyword
          const content = `${data.beforeText} ${data.moodKeyword} ${data.afterText}`;
          
          // Analyze the mood
          const tags = audioEngine.analyzeMood(content);
          
          // Property: Content with mood keywords should produce at least one mood tag
          return tags.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test: Verify mood analysis is called for each segment regardless of contributor type
  test('mood analysis processes both user and AI segments', () => {
    fc.assert(
      fc.property(
        fc.record({
          userSegments: fc.array(
            fc.string({ minLength: 10, maxLength: 100 }),
            { minLength: 1, maxLength: 5 }
          ),
          aiSegments: fc.array(
            fc.string({ minLength: 10, maxLength: 100 }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        (data) => {
          const audioEngine = new MockAudioEngine();
          
          // Create user segments
          const userSegments: StorySegment[] = data.userSegments.map((content, index) => ({
            id: randomUUID(),
            content,
            contributorId: `user-${index}`,
            contributorType: 'user' as const,
            timestamp: new Date(Date.now() + index * 1000),
            moodTags: [],
          }));
          
          // Create AI segments
          const aiSegments: StorySegment[] = data.aiSegments.map((content, index) => ({
            id: randomUUID(),
            content,
            contributorId: 'ai-coauthor',
            contributorType: 'ai' as const,
            timestamp: new Date(Date.now() + (userSegments.length + index) * 1000),
            moodTags: [],
          }));
          
          // Add all segments
          const allSegments = [...userSegments, ...aiSegments];
          for (const segment of allSegments) {
            audioEngine.onSegmentAdded(segment);
          }
          
          // Property: All segments should be analyzed regardless of contributor type
          const analyzedSegments = audioEngine.getAnalyzedSegments();
          const totalExpected = userSegments.length + aiSegments.length;
          
          return analyzedSegments.length === totalExpected;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: ghost-story-generator, Property 16: Keywords trigger sound effects
  // Validates: Requirements 4.2, 9.1
  test('horror keywords trigger corresponding sound effects', () => {
    fc.assert(
      fc.property(
        fc.record({
          keyword: fc.constantFrom(
            'scream', 'screaming', 'screamed',
            'thunder', 'thundering', 'thundered',
            'creak', 'creaking', 'creaked',
            'whisper', 'whispering', 'whispered',
            'footsteps', 'footstep',
            'door', 'doors',
            'wind', 'windy',
            'howl', 'howling', 'howled',
            'crash', 'crashing', 'crashed',
            'bang', 'banging', 'banged',
            'rattle', 'rattling', 'rattled',
            'knock', 'knocking', 'knocked'
          ),
          beforeText: fc.string({ minLength: 5, maxLength: 50 }),
          afterText: fc.string({ minLength: 5, maxLength: 50 }),
          contributorType: fc.constantFrom('user' as const, 'ai' as const),
        }),
        (data) => {
          const audioEngine = new MockAudioEngine();
          
          // Create content with a sound effect keyword
          const content = `${data.beforeText} ${data.keyword} ${data.afterText}`;
          
          // Create a segment with the keyword
          const segment: StorySegment = {
            id: randomUUID(),
            content,
            contributorId: data.contributorType === 'ai' ? 'ai-coauthor' : 'user-1',
            contributorType: data.contributorType,
            timestamp: new Date(),
            moodTags: [],
          };
          
          // Add the segment (which should trigger keyword detection)
          audioEngine.onSegmentAdded(segment);
          
          // Property: When a segment contains a horror keyword, at least one sound effect should be triggered
          const triggeredEffects = audioEngine.getTriggeredEffects();
          const keywordTriggered = triggeredEffects.length > 0;
          
          // Property: The triggered effect should correspond to the keyword in the content
          const correctKeywordTriggered = triggeredEffects.some(effect => 
            content.toLowerCase().includes(effect.toLowerCase())
          );
          
          return keywordTriggered && correctKeywordTriggered;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify multiple keywords trigger multiple effects
  test('multiple keywords in a segment trigger multiple sound effects', () => {
    fc.assert(
      fc.property(
        fc.record({
          keywords: fc.array(
            fc.constantFrom('scream', 'thunder', 'creak', 'whisper', 'door', 'wind'),
            { minLength: 2, maxLength: 4 }
          ),
          separator: fc.constantFrom(' and ', ', ', ' then ', ' with '),
        }),
        (data) => {
          const audioEngine = new MockAudioEngine();
          
          // Create content with multiple keywords
          const uniqueKeywords = [...new Set(data.keywords)];
          const content = `The story had ${uniqueKeywords.join(data.separator)} in it.`;
          
          // Create a segment
          const segment: StorySegment = {
            id: randomUUID(),
            content,
            contributorId: 'user-1',
            contributorType: 'user',
            timestamp: new Date(),
            moodTags: [],
          };
          
          // Add the segment
          audioEngine.onSegmentAdded(segment);
          
          // Property: When a segment contains multiple keywords, multiple effects should be triggered
          const triggeredEffects = audioEngine.getTriggeredEffects();
          
          // Each unique keyword should trigger at least one effect
          const allKeywordsTriggered = uniqueKeywords.every(keyword =>
            triggeredEffects.some(effect => effect.toLowerCase() === keyword.toLowerCase())
          );
          
          return allKeywordsTriggered;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test: Verify segments without keywords don't trigger effects
  test('segments without horror keywords do not trigger sound effects', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 })
          .filter(str => {
            // Filter out strings that contain any sound effect keywords
            const lowerStr = str.toLowerCase();
            const keywords = [
              'scream', 'thunder', 'creak', 'whisper', 'footstep', 'door',
              'wind', 'howl', 'crash', 'bang', 'rattle', 'knock'
            ];
            return !keywords.some(keyword => lowerStr.includes(keyword));
          }),
        (content) => {
          const audioEngine = new MockAudioEngine();
          
          // Create a segment without keywords
          const segment: StorySegment = {
            id: randomUUID(),
            content,
            contributorId: 'user-1',
            contributorType: 'user',
            timestamp: new Date(),
            moodTags: [],
          };
          
          // Add the segment
          audioEngine.onSegmentAdded(segment);
          
          // Property: Segments without horror keywords should not trigger sound effects
          const triggeredEffects = audioEngine.getTriggeredEffects();
          
          return triggeredEffects.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
