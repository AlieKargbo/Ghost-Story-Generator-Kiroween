/**
 * Client-side validation utilities
 * Mirrors backend validation for immediate feedback
 */

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

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Checks if content contains profanity
 */
export function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerContent);
  });
}

/**
 * Validates that content has non-whitespace characters
 */
export function hasContent(content: string): boolean {
  return content.trim().length > 0;
}

/**
 * Validates segment length
 */
export function isValidLength(content: string): boolean {
  const length = content.trim().length;
  return length >= MIN_SEGMENT_LENGTH && length <= MAX_SEGMENT_LENGTH;
}

/**
 * Validates a story segment with detailed feedback
 */
export function validateSegment(content: string): ValidationResult {
  // Check if content exists
  if (!hasContent(content)) {
    return { 
      valid: false, 
      error: 'Please enter some text before submitting' 
    };
  }

  const trimmedContent = content.trim();
  const length = trimmedContent.length;

  // Check length
  if (length > MAX_SEGMENT_LENGTH) {
    return {
      valid: false,
      error: `Content must be ${MAX_SEGMENT_LENGTH} characters or less (currently ${length})`,
    };
  }

  if (length < MIN_SEGMENT_LENGTH) {
    return {
      valid: false,
      error: 'Content is too short',
    };
  }

  // Check for profanity
  if (containsProfanity(trimmedContent)) {
    return { 
      valid: false, 
      error: 'Content contains inappropriate language. Please revise.' 
    };
  }

  // Warning for very short content
  if (length < 10) {
    return {
      valid: true,
      warning: 'Your contribution is quite short. Consider adding more detail.',
    };
  }

  return { valid: true };
}

/**
 * Get character count status
 */
export function getCharacterCountStatus(
  currentLength: number,
  maxLength: number = MAX_SEGMENT_LENGTH
): 'normal' | 'warning' | 'danger' {
  const remaining = maxLength - currentLength;
  
  if (remaining < 0) {
    return 'danger';
  }
  
  if (remaining < 50) {
    return 'warning';
  }
  
  return 'normal';
}
