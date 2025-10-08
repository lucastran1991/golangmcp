'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield, Users } from 'lucide-react';
import { securityAPI, usersAPI } from '@/lib/api';
import { SessionStatus } from '@/components/SessionStatus';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; username: string; role: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    const fetchData = async () => {
      try {
        const securityResponse = await securityAPI.getSecurityStatus();
        setSecurityStatus(securityResponse.data.security_status);
        setUsersLoading(true);
        const usersResponse = await usersAPI.getUsers();
        setUsers(usersResponse.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
        setUsersLoading(false);
      }
    };
    
    fetchData();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <LayoutWrapper>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </LayoutWrapper>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <LayoutWrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 mt-2">Welcome back, {user.username}!</p>
                </div>
                <div className="flex items-center space-x-4">
                  <SessionStatus showDetails={false} className="hidden sm:flex" />
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </header>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                {success}
              </div>
            )}

            {/* Session Status */}
            <div className="mb-6">
              <SessionStatus showDetails={true} />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Profile Card */}
              <Card className="bg-white/80 backdrop-blur-md shadow-lg border-none">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Username:</strong> {user.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Role:</strong> {user.role}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Status Card */}
              <Card className="bg-white/80 backdrop-blur-md shadow-lg border-none">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {securityStatus ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Rate Limiting:</strong> {securityStatus.rate_limiting ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>CSRF Protection:</strong> {securityStatus.csrf_protection ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Loading security status...</p>
                  )}
                </CardContent>
              </Card>

              {/* Users Card */}
              <Card className="bg-white/80 backdrop-blur-md shadow-lg border-none">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    System Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <p className="text-sm text-gray-500">Loading users...</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Total Users:</strong> {users.length}
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        {users.slice(0, 5).map((u) => (
                          <div key={u.id} className="text-xs text-gray-500 py-1">
                            {u.username} ({u.role})
                          </div>
                        ))}
                        {users.length > 5 && (
                          <div className="text-xs text-gray-400">
                            ... and {users.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}