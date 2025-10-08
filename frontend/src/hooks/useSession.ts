/**
 * Custom hook for session management
 * Provides easy access to session utilities and state
 */

import { useAuth } from '@/contexts/AuthContext';
import { 
  getTimeUntilExpiry, 
  formatTimeUntilExpiry, 
  isTokenExpiringSoon, 
  isSessionValid,
  onSessionEvent,
  SESSION_EVENTS
} from '@/lib/session';
import { useEffect, useState } from 'react';

export function useSession() {
  const { user, token, sessionId, refreshSession, logout } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (!user || !token || !sessionId) {
      setTimeUntilExpiry('');
      setIsExpiringSoon(false);
      setIsValid(false);
      return;
    }

    const updateSessionInfo = () => {
      const timeUntil = getTimeUntilExpiry();
      const formatted = formatTimeUntilExpiry();
      const expiringSoon = isTokenExpiringSoon(5);
      const valid = isSessionValid();
      
      setTimeUntilExpiry(formatted);
      setIsExpiringSoon(expiringSoon);
      setIsValid(valid);
    };

    // Update immediately
    updateSessionInfo();

    // Update every 30 seconds
    const interval = setInterval(updateSessionInfo, 30000);

    // Listen for session events
    const cleanup = onSessionEvent('session:refresh', updateSessionInfo);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [user, token, sessionId]);

  const handleRefresh = async () => {
    try {
      await refreshSession();
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return {
    // Session data
    user,
    token,
    sessionId,
    isValid,
    
    // Session status
    timeUntilExpiry,
    isExpiringSoon,
    
    // Session actions
    refreshSession: handleRefresh,
    logout: handleLogout,
    
    // Session events
    onLogin: (callback: (event: CustomEvent) => void) => onSessionEvent(SESSION_EVENTS.LOGIN, callback),
    onLogout: (callback: (event: CustomEvent) => void) => onSessionEvent(SESSION_EVENTS.LOGOUT, callback),
    onRefresh: (callback: (event: CustomEvent) => void) => onSessionEvent(SESSION_EVENTS.REFRESH, callback),
    onExpire: (callback: (event: CustomEvent) => void) => onSessionEvent(SESSION_EVENTS.EXPIRE, callback),
  };
}
