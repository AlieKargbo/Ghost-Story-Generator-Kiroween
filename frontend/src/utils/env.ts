/**
 * Environment variable utilities
 * Handles both Vite and test environments
 */

export function getWebSocketUrl(): string {
  // In test environment, use process.env
  if (typeof process !== 'undefined' && process.env?.VITE_WS_URL) {
    return process.env.VITE_WS_URL;
  }
  
  // Default fallback
  return 'http://localhost:3000';
}
