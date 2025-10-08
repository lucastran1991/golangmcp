'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  User, 
  Shield, 
  Users, 
  Settings, 
  Key, 
  Camera, 
  BarChart3, 
  FolderOpen, 
  Activity,
  Clock,
  Database,
  Server,
  Eye,
  MoreHorizontal
} from 'lucide-react';
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

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Button
                  onClick={() => router.push('/profile/edit')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <User className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">Edit Profile</span>
                </Button>

                <Button
                  onClick={() => router.push('/profile/change-password')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <Key className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">Change Password</span>
                </Button>

                <Button
                  onClick={() => router.push('/profile/avatar')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <Camera className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">Upload Avatar</span>
                </Button>

                <Button
                  onClick={() => router.push('/profile/settings')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <Settings className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">Account Settings</span>
                </Button>

                <Button
                  onClick={() => router.push('/deployment')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <BarChart3 className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">System Metrics</span>
                </Button>

                <Button
                  onClick={() => router.push('/files')}
                  className="group/btn h-20 flex flex-col items-center justify-center space-y-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                  <FolderOpen className="h-6 w-6 relative" />
                  <span className="text-xs font-medium relative">File Manager</span>
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Profile Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      Profile
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/profile/edit')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-semibold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Status Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur-sm opacity-30"></div>
                      <div className="relative w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  {securityStatus ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rate Limiting</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          securityStatus.rate_limiting 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {securityStatus.rate_limiting ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">CSRF Protection</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          securityStatus.csrf_protection 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {securityStatus.csrf_protection ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Security Headers</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          securityStatus.security_headers 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {securityStatus.security_headers ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Users Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      System Users
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Users</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {users.length}
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {users.slice(0, 5).map((u) => (
                          <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-50">
                            <span className="text-gray-700">{u.username}</span>
                            <span className="text-gray-500 capitalize">{u.role}</span>
                          </div>
                        ))}
                        {users.length > 5 && (
                          <div className="text-xs text-gray-400 text-center py-1">
                            ... and {users.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg blur-sm opacity-30"></div>
                      <div className="relative w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Server className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">File Upload</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Ready
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Session Manager</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-xs text-gray-500">24h 15m</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg blur-sm opacity-30"></div>
                      <div className="relative w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Logged in successfully</span>
                      <span className="text-xs text-gray-400 ml-auto">2m ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Profile updated</span>
                      <span className="text-xs text-gray-400 ml-auto">1h ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-600">Password changed</span>
                      <span className="text-xs text-gray-400 ml-auto">3d ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card className="group bg-white/80 backdrop-blur-md shadow-lg border-none hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg blur-sm opacity-30"></div>
                      <div className="relative w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Database className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Files Uploaded</span>
                      <span className="text-lg font-bold text-teal-600">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Storage Used</span>
                      <span className="text-lg font-bold text-teal-600">2.4 GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Sessions Active</span>
                      <span className="text-lg font-bold text-teal-600">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Login</span>
                      <span className="text-sm text-gray-500">Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}