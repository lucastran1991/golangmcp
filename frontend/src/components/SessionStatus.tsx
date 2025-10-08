'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTimeUntilExpiry, formatTimeUntilExpiry, isTokenExpiringSoon, onSessionEvent } from '@/lib/session';
import { Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface SessionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function SessionStatus({ showDetails = false, className = '' }: SessionStatusProps) {
  const { user, sessionId } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);

  useEffect(() => {
    if (!user || !sessionId) return;

    const updateTimeDisplay = () => {
      const timeUntil = getTimeUntilExpiry();
      const formatted = formatTimeUntilExpiry();
      const expiringSoon = isTokenExpiringSoon(5);
      
      setTimeUntilExpiry(formatted);
      setIsExpiringSoon(expiringSoon);
    };

    // Update immediately
    updateTimeDisplay();

    // Update every 30 seconds
    const interval = setInterval(updateTimeDisplay, 30000);

    // Listen for session events
    const cleanup = onSessionEvent('session:refresh', updateTimeDisplay);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [user, sessionId]);

  if (!user || !sessionId) {
    return null;
  }

  const getStatusIcon = () => {
    if (timeUntilExpiry === 'Expired') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (isExpiringSoon) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    if (timeUntilExpiry === 'Expired') {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (isExpiringSoon) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {timeUntilExpiry === 'Expired' ? 'Session Expired' : `Expires in ${timeUntilExpiry}`}
        </span>
      </div>
    );
  }

  return (
    <Card className={`group bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                Session Status
              </h3>
              <p className="text-sm text-gray-600">
                {user.username} • {sessionId.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor()} group-hover:shadow-md transition-all duration-200`}>
              <Clock className="h-3 w-3 mr-1" />
              {timeUntilExpiry}
            </Badge>
            {getStatusIcon()}
          </div>
        </div>
        
        {isExpiringSoon && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">
                Session will expire soon. Please save your work.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
