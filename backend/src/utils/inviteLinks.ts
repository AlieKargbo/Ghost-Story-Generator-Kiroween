import { randomBytes } from 'crypto';

// Store invite tokens and their associated session IDs
const inviteTokens = new Map<string, string>();

/**
 * Generates a secure invite link for a session
 * @param sessionId - The session ID to create an invite link for
 * @param baseUrl - The base URL for the application (e.g., 'http://localhost:5173')
 * @returns The complete invite link URL
 */
export function generateInviteLink(sessionId: string, baseUrl: string = 'http://localhost:5173'): string {
  // Generate a cryptographically secure random token
  const token = randomBytes(32).toString('hex');
  
  // Store the mapping between token and session ID
  inviteTokens.set(token, sessionId);
  
  // Create the invite link
  const inviteLink = `${baseUrl}/join/${token}`;
  
  return inviteLink;
}

/**
 * Validates an invite token and returns the associated session ID
 * @param token - The invite token to validate
 * @returns The session ID if valid, null otherwise
 */
export function validateInviteToken(token: string): string | null {
  return inviteTokens.get(token) || null;
}

/**
 * Extracts the token from an invite link URL
 * @param inviteLink - The full invite link URL
 * @returns The token if found, null otherwise
 */
export function extractTokenFromLink(inviteLink: string): string | null {
  try {
    const url = new URL(inviteLink);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    return token || null;
  } catch (error) {
    return null;
  }
}

/**
 * Revokes an invite token
 * @param token - The token to revoke
 */
export function revokeInviteToken(token: string): void {
  inviteTokens.delete(token);
}

/**
 * Gets the session ID for a given invite link
 * @param inviteLink - The invite link URL
 * @returns The session ID if valid, null otherwise
 */
export function getSessionIdFromInviteLink(inviteLink: string): string | null {
  const token = extractTokenFromLink(inviteLink);
  if (!token) {
    return null;
  }
  return validateInviteToken(token);
}
