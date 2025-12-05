import { NarrativeContext, HorrorElement, StorySegment } from '../../../shared/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';

export class AICoAuthor {
  private readonly segmentThreshold: number;
  private readonly maxContextSegments: number;
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly model: any;
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second

  constructor(segmentThreshold: number = 5, maxContextSegments: number = 20, apiKey?: string) {
    this.segmentThreshold = segmentThreshold;
    this.maxContextSegments = maxContextSegments;

    // Initialize Google Gemini client if API key is provided
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Try gemini-1.5-flash-latest which should be available
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
      console.log('✅ Gemini model initialized: gemini-2.5-flash-latest');
    } else {
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Extract character names and locations from narrative text
   * Uses simple heuristics: capitalized words for characters, location keywords
   */
  extractEntities(text: string): { characters: string[]; locations: string[] } {
    const characters: Set<string> = new Set();
    const locations: Set<string> = new Set();

    // Common location keywords
    const locationKeywords = [
      'house', 'mansion', 'forest', 'woods', 'basement', 'attic', 'cemetery',
      'graveyard', 'church', 'hospital', 'school', 'cabin', 'castle', 'tower',
      'dungeon', 'cave', 'tunnel', 'bridge', 'lake', 'ocean', 'river', 'swamp',
      'village', 'town', 'city', 'street', 'road', 'alley', 'room', 'hallway',
      'corridor', 'staircase', 'door', 'window', 'garden', 'yard', 'field'
    ];

    // Extract potential character names (capitalized words that aren't at sentence start)
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 1; i < words.length; i++) {
        const word = words[i].replace(/[^a-zA-Z]/g, '');
        if (word.length > 2 && /^[A-Z][a-z]+$/.test(word)) {
          // Exclude common words that aren't names
          const commonWords = ['The', 'This', 'That', 'There', 'Then', 'When', 'Where', 'What', 'Who', 'How', 'Why'];
          if (!commonWords.includes(word)) {
            characters.add(word);
          }
        }
      }
    }

    // Extract locations
    const lowerText = text.toLowerCase();
    for (const keyword of locationKeywords) {
      if (lowerText.includes(keyword)) {
        locations.add(keyword);
      }
    }

    return {
      characters: Array.from(characters),
      locations: Array.from(locations)
    };
  }

  /**
   * Check if AI should trigger based on narrative length
   */
  shouldTrigger(context: NarrativeContext): boolean {
    return context.segments.length >= this.segmentThreshold;
  }

  /**
   * Summarize narrative context for LLM input
   * Takes the most recent segments and extracts key information
   */
  summarizeContext(segments: StorySegment[]): string {
    // Take only the most recent segments to avoid token limits
    const recentSegments = segments.slice(-this.maxContextSegments);

    // Combine all segment content
    const fullText = recentSegments.map(s => s.content).join(' ');

    // Extract entities from the full text
    const entities = this.extractEntities(fullText);

    // Build summary
    let summary = 'Story so far:\n';
    summary += recentSegments.map((s, i) => `${i + 1}. ${s.content}`).join('\n');

    if (entities.characters.length > 0) {
      summary += `\n\nCharacters mentioned: ${entities.characters.join(', ')}`;
    }

    if (entities.locations.length > 0) {
      summary += `\n\nLocations mentioned: ${entities.locations.join(', ')}`;
    }

    return summary;
  }

  /**
   * Build narrative context from segments
   */
  buildNarrativeContext(segments: StorySegment[]): NarrativeContext {
    const fullText = segments.map(s => s.content).join(' ');
    const entities = this.extractEntities(fullText);

    return {
      segments,
      characters: entities.characters,
      locations: entities.locations,
      timeperiod: this.detectTimePeriod(fullText),
      genre: 'horror'
    };
  }

  /**
   * Detect time period from text (simple heuristic)
   */
  private detectTimePeriod(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/\b(victorian|1800s|nineteenth century)\b/)) {
      return 'victorian';
    }
    if (lowerText.match(/\b(medieval|middle ages|castle|knight)\b/)) {
      return 'medieval';
    }
    if (lowerText.match(/\b(modern|today|smartphone|internet|computer)\b/)) {
      return 'modern';
    }

    return undefined;
  }

  /**
   * Generate a horror element using Google Gemini with context awareness
   */
  async generateHorrorElement(context: NarrativeContext): Promise<HorrorElement> {
    if (!this.model) {
      throw new Error('Google Gemini client not initialized. Please provide an API key.');
    }

    const prompt = this.buildPrompt(context);

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const systemInstruction = 'You are a creative horror writer. Add a creepy twist to this ghost story. Write 2-3 sentences that introduce an unexpected horror element. Be atmospheric and eerie.';

        const fullPrompt = `${systemInstruction}\n\n${prompt}`;

        console.log('🔍 Sending prompt to Gemini (length:', fullPrompt.length, 'chars)');

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            // 🚨 FIX 1: Increase the token limit to ensure there's enough room for output
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40,

          },

        });

        const response = result.response;

        // Check if content was blocked by safety filters
        if (response.promptFeedback?.blockReason) {
          console.warn('⚠️ Content blocked by Gemini:', response.promptFeedback.blockReason);
          throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
        }

        // Check for candidate blocks
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          console.warn('⚠️ Content blocked by safety filters');
          throw new Error('Content blocked by safety filters');
        }

        const content = response.text()?.trim() || '';
        console.log('🔍 Generated content:', content.substring(0, 100));

        if (!content) {
          console.error('❌ Empty content from Gemini. Response:', JSON.stringify(response, null, 2));
          throw new Error('Gemini returned empty content');
        }

        // Filter the generated content
        const filteredContent = this.filterContent(content);
        console.log('✅ Final content length:', filteredContent.length, 'chars');

        // Calculate intensity based on keywords
        const intensity = this.calculateIntensity(filteredContent);

        // Extract tags
        const tags = this.extractHorrorTags(filteredContent);

        return {
          content: filteredContent,
          intensity,
          tags
        };
      } catch (error) {
        // 🚨 FIX: Log the full error immediately for debugging
        console.error(`❌ Attempt ${attempt + 1} failed with error:`, error);
        lastError = error as Error;

        // If it's a rate limit error, wait with exponential backoff
        // NOTE: The current SDK does not always throw a specific error type,
        // so logging the message is key to determining the actual issue.
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.log(`⏱️ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to generate horror element after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Build prompt for LLM based on narrative context
   */
  private buildPrompt(context: NarrativeContext): string {
    let prompt = 'Continue this ghost story with an unexpected horror element:\n\n';

    // Add recent segments
    const recentSegments = context.segments.slice(-this.maxContextSegments);
    prompt += recentSegments.map(s => s.content).join(' ');

    // Add context hints
    if (context.characters.length > 0) {
      prompt += `\n\nCharacters in the story: ${context.characters.join(', ')}`;
    }

    if (context.locations.length > 0) {
      prompt += `\nLocations mentioned: ${context.locations.join(', ')}`;
    }

    if (context.timeperiod) {
      prompt += `\nTime period: ${context.timeperiod}`;
    }

    prompt += '\n\nAdd a creepy twist or horror element that fits the story:';

    console.log('📝 Built prompt for AI:', prompt);

    return prompt;
  }

  /**
   * Filter inappropriate content from AI-generated text
   */
  filterContent(text: string): string {
    // List of graphic violence keywords to filter
    const graphicKeywords = [
      'gore', 'guts', 'dismember', 'decapitat', 'mutilat', 'torture',
      'eviscerat', 'disembowel', 'blood splatter', 'severed limb'
    ];

    // List of explicit content keywords
    const explicitKeywords = [
      'sexual', 'nude', 'naked', 'rape', 'molest'
    ];

    const lowerText = text.toLowerCase();

    // Check for inappropriate content
    for (const keyword of [...graphicKeywords, ...explicitKeywords]) {
      if (lowerText.includes(keyword)) {
        // Return a generic horror element instead
        return 'A cold presence filled the room, and the shadows seemed to move on their own.';
      }
    }

    return text;
  }

  /**
   * Calculate intensity of horror element based on keywords
   */
  private calculateIntensity(text: string): number {
    const intensityKeywords = {
      high: ['scream', 'terror', 'horrifying', 'nightmare', 'death', 'dead', 'corpse', 'ghost'],
      medium: ['fear', 'dark', 'shadow', 'cold', 'whisper', 'strange', 'eerie'],
      low: ['odd', 'unusual', 'quiet', 'silence', 'distant']
    };

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const keyword of intensityKeywords.high) {
      if (lowerText.includes(keyword)) score += 3;
    }

    for (const keyword of intensityKeywords.medium) {
      if (lowerText.includes(keyword)) score += 2;
    }

    for (const keyword of intensityKeywords.low) {
      if (lowerText.includes(keyword)) score += 1;
    }

    // Normalize to 0-10 scale
    return Math.min(10, Math.max(1, score));
  }

  /**
   * Extract horror-related tags from text
   */
  private extractHorrorTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    const tagKeywords = {
      'supernatural': ['ghost', 'spirit', 'phantom', 'apparition', 'haunting'],
      'psychological': ['fear', 'terror', 'madness', 'insanity', 'paranoia'],
      'gothic': ['darkness', 'shadow', 'ancient', 'decay', 'ruins'],
      'suspense': ['whisper', 'footsteps', 'watching', 'following', 'lurking']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          tags.push(tag);
          break;
        }
      }
    }

    return tags;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create an AI segment from a horror element
   */
  createAISegment(horrorElement: HorrorElement, sessionId: string): StorySegment {
    return {
      id: this.generateSegmentId(),
      content: horrorElement.content,
      contributorId: 'ai-coauthor',
      contributorType: 'ai',
      timestamp: new Date(),
      moodTags: horrorElement.tags
    };
  }

  /**
   * Generate a unique segment ID
   */
  private generateSegmentId(): string {
    return randomUUID();
  }
}
