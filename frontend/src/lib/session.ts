/**
 * Session Management Utilities
 * Provides helper functions for managing user sessions in the browser
 */

import type { User } from '@/lib/api';

export interface SessionData {
  token: string;
  user: User;
  sessionId: string;
  expiresAt: string;
}

export interface StoredSession {
  token: string;
  user: User;
  sessionId: string;
  tokenExpiry: number;
}

/**
 * Session Storage Keys
 */
export const SESSION_KEYS = {
  TOKEN: 'authToken',
  USER: 'user',
  SESSION_ID: 'sessionId',
  TOKEN_EXPIRY: 'tokenExpiry',
} as const;

/**
 * Store session data in both localStorage and sessionStorage
 */
export const storeSession = (sessionData: SessionData): void => {
  const expiryTime = new Date(sessionData.expiresAt).getTime() - (5 * 60 * 1000); // 5 minutes buffer
  
  const sessionToStore = {
    token: sessionData.token,
    user: sessionData.user,
    sessionId: sessionData.sessionId,
    tokenExpiry: expiryTime,
  };

  // Store in localStorage (persistent across browser sessions)
  localStorage.setItem(SESSION_KEYS.TOKEN, sessionData.token);
  localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(sessionData.user));
  localStorage.setItem(SESSION_KEYS.SESSION_ID, sessionData.sessionId);
  localStorage.setItem(SESSION_KEYS.TOKEN_EXPIRY, expiryTime.toString());

  // Store in sessionStorage (cleared when browser tab closes)
  sessionStorage.setItem(SESSION_KEYS.TOKEN, sessionData.token);
  sessionStorage.setItem(SESSION_KEYS.USER, JSON.stringify(sessionData.user));
  sessionStorage.setItem(SESSION_KEYS.SESSION_ID, sessionData.sessionId);

  console.log('✅ Session stored successfully:', {
    sessionId: sessionData.sessionId,
    expiresAt: sessionData.expiresAt,
    username: sessionData.user.username,
  });
};

/**
 * Retrieve session data from storage
 */
export const getStoredSession = (): StoredSession | null => {
  try {
    const token = localStorage.getItem(SESSION_KEYS.TOKEN);
    const user = localStorage.getItem(SESSION_KEYS.USER);
    const sessionId = localStorage.getItem(SESSION_KEYS.SESSION_ID);
    const tokenExpiry = localStorage.getItem(SESSION_KEYS.TOKEN_EXPIRY);

    if (!token || !user || !sessionId || !tokenExpiry) {
      return null;
    }

    return {
      token,
      user: JSON.parse(user),
      sessionId,
      tokenExpiry: parseInt(tokenExpiry),
    };
  } catch (error) {
    console.error('Error retrieving stored session:', error);
    return null;
  }
};

/**
 * Check if the current session is valid (not expired)
 */
export const isSessionValid = (): boolean => {
  const session = getStoredSession();
  if (!session) return false;

  const now = new Date().getTime();
  return now < session.tokenExpiry;
};

/**
 * Clear all session data from storage
 */
export const clearSession = (): void => {
  // Clear localStorage
  Object.values(SESSION_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear sessionStorage
  Object.values(SESSION_KEYS).forEach(key => {
    sessionStorage.removeItem(key);
  });

  console.log('✅ Session cleared successfully');
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTimeUntilExpiry = (): number => {
  const session = getStoredSession();
  if (!session) return 0;

  const now = new Date().getTime();
  return Math.max(0, session.tokenExpiry - now);
};

/**
 * Check if token is expiring soon (within specified minutes)
 */
export const isTokenExpiringSoon = (minutes: number = 5): boolean => {
  const timeUntilExpiry = getTimeUntilExpiry();
  const minutesInMs = minutes * 60 * 1000;
  return timeUntilExpiry > 0 && timeUntilExpiry < minutesInMs;
};

/**
 * Format time until expiry for display
 */
export const formatTimeUntilExpiry = (): string => {
  const timeUntilExpiry = getTimeUntilExpiry();
  if (timeUntilExpiry <= 0) return 'Expired';

  const minutes = Math.floor(timeUntilExpiry / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Session event types for custom events
 */
export const SESSION_EVENTS = {
  LOGIN: 'session:login',
  LOGOUT: 'session:logout',
  REFRESH: 'session:refresh',
  EXPIRE: 'session:expire',
} as const;

/**
 * Dispatch session events for other components to listen to
 */
export const dispatchSessionEvent = (eventType: string, data?: unknown): void => {
  const event = new CustomEvent(eventType, { detail: data });
  window.dispatchEvent(event);
};

/**
 * Listen for session events
 */
export const onSessionEvent = (
  eventType: string,
  callback: (event: CustomEvent) => void
): (() => void) => {
  const handler = (event: Event) => callback(event as CustomEvent);
  window.addEventListener(eventType, handler);
  
  // Return cleanup function
  return () => window.removeEventListener(eventType, handler);
};
