'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '@/lib/api';
import { storeSession, getStoredSession, clearSession, isSessionValid, dispatchSessionEvent } from '@/lib/session';

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshSession: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const session = getStoredSession();
    
    if (session && isSessionValid()) {
      setToken(session.token);
      setUser(session.user);
      setSessionId(session.sessionId);
      console.log('✅ Restored valid session:', {
        username: session.user.username,
        sessionId: session.sessionId,
      });
    } else if (session) {
      // Session exists but is expired
      clearSession();
      console.log('⏰ Session expired, cleared storage');
    }
    
    setLoading(false);
  }, []);

  // Auto-refresh session and validate token
  useEffect(() => {
    if (!token) return;

    const checkTokenValidity = () => {
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (tokenExpiry) {
        const now = new Date().getTime();
        const expiry = parseInt(tokenExpiry);
        const timeUntilExpiry = expiry - now;
        
        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log('🔄 Token expiring soon, refreshing session...');
          refreshSession();
        } else if (timeUntilExpiry <= 0) {
          console.log('⏰ Token expired, logging out...');
          logout();
        }
      }
    };

    // Check immediately
    checkTokenValidity();
    
    // Check every minute
    const interval = setInterval(checkTokenValidity, 60000);
    
    return () => clearInterval(interval);
  }, [token]);

  // Clear stored authentication data
  const clearStoredAuth = () => {
    clearSession();
  };

  const login = async (username: string, password: string) => {
    try {
      const { authAPI } = await import('@/lib/api');
      const response = await authAPI.login({ username, password });
      const data: AuthResponse = response.data;
      
      setToken(data.token);
      setUser(data.user);
      setSessionId(data.session_id);
      
      // Store session using utility function
      storeSession({
        token: data.token,
        user: data.user,
        sessionId: data.session_id,
        expiresAt: data.expires_at,
      });
      
      // Dispatch login event
      dispatchSessionEvent('session:login', {
        username: data.user.username,
        sessionId: data.session_id,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const { authAPI } = await import('@/lib/api');
      await authAPI.register({ username, email, password });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate session on server
      if (token) {
        const { authAPI } = await import('@/lib/api');
        await authAPI.logout();
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear all stored data
      setToken(null);
      setUser(null);
      setSessionId(null);
      clearStoredAuth();
      
      // Dispatch logout event
      dispatchSessionEvent('session:logout');
      
      console.log('✅ User logged out successfully');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Dispatch user update event
    dispatchSessionEvent('session:refresh', { user: updatedUser });
  };

  const refreshSession = async () => {
    try {
      if (!token) return;
      
      const { profileAPI } = await import('@/lib/api');
      const response = await profileAPI.getProfile();
      const updatedUser = response.data;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch refresh event
      dispatchSessionEvent('session:refresh', { user: updatedUser });
      
      console.log('✅ Session refreshed successfully');
    } catch (error) {
      console.error('Session refresh failed:', error);
      // If refresh fails, logout user
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, sessionId, login, register, logout, updateUser, refreshSession, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
