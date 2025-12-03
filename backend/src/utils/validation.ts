// Validation utilities for content filtering and input sanitization

const PROFANITY_LIST = [
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

const MAX_SEGMENT_LENGTH = 500;
const MIN_SEGMENT_LENGTH = 1;

/**
 * Checks if content contains profanity or inappropriate words
 * @param content - The text content to check
 * @returns true if profanity is detected, false otherwise
 */
export function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerContent);
  });
}

/**
 * Filters profanity from content by replacing with asterisks
 * @param content - The text content to filter
 * @returns Filtered content with profanity replaced
 */
export function filterProfanity(content: string): string {
  let filtered = content;
  PROFANITY_LIST.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

/**
 * Sanitizes input by removing potentially dangerous characters
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validates segment length
 * @param content - The content to validate
 * @returns true if length is valid, false otherwise
 */
export function isValidLength(content: string): boolean {
  const length = content.trim().length;
  return length >= MIN_SEGMENT_LENGTH && length <= MAX_SEGMENT_LENGTH;
}

/**
 * Validates that content is not empty or only whitespace
 * @param content - The content to validate
 * @returns true if content has non-whitespace characters
 */
export function hasContent(content: string): boolean {
  return content.trim().length > 0;
}

/**
 * Validates a story segment submission
 * @param content - The segment content to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateSegment(content: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Check if content exists
  if (!hasContent(content)) {
    return { valid: false, error: 'Content cannot be empty or only whitespace' };
  }

  // Sanitize input
  const sanitized = sanitizeInput(content);

  // Check length after sanitization
  if (!isValidLength(sanitized)) {
    return {
      valid: false,
      error: `Content must be between ${MIN_SEGMENT_LENGTH} and ${MAX_SEGMENT_LENGTH} characters`,
    };
  }

  // Check for profanity
  if (containsProfanity(sanitized)) {
    return { valid: false, error: 'Content contains inappropriate language' };
  }

  return { valid: true, sanitized };
}
