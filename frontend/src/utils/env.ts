/**
 * Environment variable utilities
 * Handles both Vite and test environments
 */

export function getWebSocketUrl(): string {
  // Vite exposes env vars on import.meta.env (NOT process.env)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Default fallback for development
  return 'http://localhost:3000';
}
