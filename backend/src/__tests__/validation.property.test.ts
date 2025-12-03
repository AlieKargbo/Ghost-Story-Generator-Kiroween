import * as fc from 'fast-check';
import { containsProfanity, validateSegment } from '../utils/validation.js';

describe('Validation Property Tests', () => {
  // Feature: ghost-story-generator, Property 7: Profanity filtering rejects inappropriate content
  // Validates: Requirements 2.3
  test('profanity filtering rejects inappropriate content', () => {
    // List of known profanity words to test
    const profanityWords = [
      'fuck',
      'shit',
      'damn',
      'bitch',
      'ass',
      'bastard',
      'crap',
      'piss',
      'cock',
      'dick',
      'pussy',
      'cunt',
      'whore',
      'slut',
      'fag',
      'nigger',
      'retard',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...profanityWords),
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        (profanity, prefix, suffix) => {
          // Create content with profanity embedded
          const content = `${prefix} ${profanity} ${suffix}`;
          
          // The content should be detected as containing profanity
          const hasProfanity = containsProfanity(content);
          
          // Validation should reject it
          const validation = validateSegment(content);
          
          return hasProfanity && !validation.valid;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('clean content passes profanity filter', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => {
          // Filter out strings that contain profanity
          const profanityWords = [
            'fuck',
            'shit',
            'damn',
            'bitch',
            'ass',
            'bastard',
            'crap',
            'piss',
            'cock',
            'dick',
            'pussy',
            'cunt',
            'whore',
            'slut',
            'fag',
            'nigger',
            'retard',
          ];
          const lower = s.toLowerCase();
          return !profanityWords.some((word) => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lower);
          });
        }),
        (cleanContent) => {
          // Clean content should not be detected as profanity
          const hasProfanity = containsProfanity(cleanContent);
          return !hasProfanity;
        }
      ),
      { numRuns: 100 }
    );
  });
});
