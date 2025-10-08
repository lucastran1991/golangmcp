# Session Management System

This document describes the comprehensive session management system implemented in the frontend application.

## Overview

The session management system provides secure, persistent user sessions with automatic token validation, refresh capabilities, and cross-tab synchronization.

## Architecture

### Core Components

1. **AuthContext** (`/contexts/AuthContext.tsx`) - Main authentication context
2. **Session Utilities** (`/lib/session.ts`) - Session storage and validation utilities
3. **SessionStatus Component** (`/components/SessionStatus.tsx`) - UI component for session status
4. **useSession Hook** (`/hooks/useSession.ts`) - Custom hook for session management

### Storage Strategy

The system uses a dual-storage approach:

- **localStorage**: Persistent storage across browser sessions
  - `authToken` - JWT authentication token
  - `user` - User profile data
  - `sessionId` - Server-side session identifier
  - `tokenExpiry` - Token expiration timestamp

- **sessionStorage**: Temporary storage cleared when tab closes
  - `authToken` - JWT authentication token
  - `user` - User profile data
  - `sessionId` - Server-side session identifier

## Features

### 1. Automatic Token Validation

- Tokens are validated on app startup
- Expired tokens are automatically cleared
- Invalid sessions trigger logout

### 2. Token Refresh

- Automatic refresh when token expires in < 5 minutes
- Manual refresh capability
- Graceful fallback to logout on refresh failure

### 3. Cross-Tab Synchronization

- Session events are dispatched across tabs
- Login/logout events sync across all open tabs
- Session expiry notifications

### 4. Security Features

- CSRF token handling
- Secure token storage
- Automatic cleanup on logout
- Session invalidation on server

## Usage

### Basic Usage

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, token, sessionId, login, logout } = useAuth();
  
  // Use authentication state and methods
}
```

### Advanced Session Management

```tsx
import { useSession } from '@/hooks/useSession';

function MyComponent() {
  const { 
    user, 
    isValid, 
    timeUntilExpiry, 
    isExpiringSoon,
    refreshSession,
    onLogin,
    onLogout 
  } = useSession();
  
  // Listen for session events
  useEffect(() => {
    const cleanup = onLogin((event) => {
      console.log('User logged in:', event.detail);
    });
    
    return cleanup;
  }, [onLogin]);
}
```

### Session Status Display

```tsx
import { SessionStatus } from '@/components/SessionStatus';

function Dashboard() {
  return (
    <div>
      {/* Simple status indicator */}
      <SessionStatus showDetails={false} />
      
      {/* Detailed status card */}
      <SessionStatus showDetails={true} />
    </div>
  );
}
```

## API Reference

### Session Utilities

#### `storeSession(sessionData: SessionData): void`
Stores session data in both localStorage and sessionStorage.

#### `getStoredSession(): StoredSession | null`
Retrieves session data from storage.

#### `isSessionValid(): boolean`
Checks if the current session is valid (not expired).

#### `clearSession(): void`
Clears all session data from storage.

#### `getTimeUntilExpiry(): number`
Returns time until token expires in milliseconds.

#### `isTokenExpiringSoon(minutes?: number): boolean`
Checks if token expires within specified minutes (default: 5).

#### `formatTimeUntilExpiry(): string`
Returns formatted time until expiry (e.g., "2h 30m").

### Session Events

#### `SESSION_EVENTS.LOGIN`
Dispatched when user logs in.

#### `SESSION_EVENTS.LOGOUT`
Dispatched when user logs out.

#### `SESSION_EVENTS.REFRESH`
Dispatched when session is refreshed.

#### `SESSION_EVENTS.EXPIRE`
Dispatched when session expires.

### Event Handling

```tsx
import { onSessionEvent, SESSION_EVENTS } from '@/lib/session';

// Listen for session events
const cleanup = onSessionEvent(SESSION_EVENTS.LOGIN, (event) => {
  console.log('User logged in:', event.detail);
});

// Cleanup listener
cleanup();
```

## Security Considerations

### Token Security
- Tokens are stored in both localStorage and sessionStorage
- Automatic cleanup on logout
- Server-side session invalidation

### CSRF Protection
- CSRF tokens are automatically included in requests
- Token refresh on each request
- Secure token handling

### Session Validation
- Token expiry validation
- Automatic logout on invalid sessions
- Cross-tab session synchronization

## Best Practices

### 1. Session Lifecycle
- Always check session validity on app startup
- Implement proper cleanup on logout
- Handle session expiry gracefully

### 2. Error Handling
- Implement fallback for session refresh failures
- Handle network errors gracefully
- Provide user feedback for session issues

### 3. User Experience
- Show session status to users
- Warn before session expiry
- Provide clear logout functionality

### 4. Performance
- Use efficient storage mechanisms
- Minimize API calls for session validation
- Implement proper cleanup

## Troubleshooting

### Common Issues

1. **Session not persisting**
   - Check localStorage availability
   - Verify token expiry calculation
   - Check for storage quota exceeded

2. **Token refresh failures**
   - Verify API endpoint availability
   - Check CSRF token handling
   - Ensure proper error handling

3. **Cross-tab sync issues**
   - Verify event dispatching
   - Check event listener cleanup
   - Ensure proper event handling

### Debug Tools

```tsx
// Check session status
import { getStoredSession, isSessionValid } from '@/lib/session';

const session = getStoredSession();
const isValid = isSessionValid();
console.log('Session:', session, 'Valid:', isValid);
```

## Migration Guide

### From Basic localStorage

```tsx
// Old approach
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// New approach
import { storeSession } from '@/lib/session';
storeSession({ token, user, sessionId, expiresAt });
```

### From Manual Session Management

```tsx
// Old approach
const [user, setUser] = useState(null);
const [token, setToken] = useState(null);

// New approach
import { useAuth } from '@/contexts/AuthContext';
const { user, token, login, logout } = useAuth();
```

## Future Enhancements

1. **Session Analytics**
   - Track session duration
   - Monitor refresh patterns
   - User behavior analytics

2. **Advanced Security**
   - Device fingerprinting
   - IP validation
   - Suspicious activity detection

3. **Performance Optimization**
   - Lazy session validation
   - Background refresh
   - Optimized storage

4. **User Experience**
   - Session warnings
   - Auto-save functionality
   - Offline support
