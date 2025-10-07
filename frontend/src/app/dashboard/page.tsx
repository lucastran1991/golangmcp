'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { profileAPI, securityAPI, User, SecurityStatus } from '@/lib/api';
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Shield, 
  Settings, 
  LogOut,
  Upload,
  Trash2,
  Loader2,
  CheckCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchSecurityStatus = async () => {
      try {
        const response = await securityAPI.getSecurityStatus();
        setSecurityStatus(response.data.security_status);
      } catch (err) {
        console.error('Failed to fetch security status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityStatus();
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Uploading avatar');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Selected file:', file.name, file.type, file.size);

    try {
      setLoading(true);
      setError(null);
      console.log('Calling profileAPI.uploadAvatar...');
      const response = await profileAPI.uploadAvatar(file);
      console.log('Upload response:', response.data);
      
      // Update user data in context instead of reloading
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setSuccess('Avatar uploaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Deleting avatar...');
      const response = await profileAPI.deleteAvatar();
      console.log('Delete response:', response.data);
      
      // Update user data in context instead of reloading
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setSuccess('Avatar deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.error || 'Failed to delete avatar');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
              <AlertDescription className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Profile
                </CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar ? `http://localhost:8080${user.avatar}` : undefined} />
                    <AvatarFallback>
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{user.username}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {user.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button size="sm" variant="outline" disabled={loading} className="z-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Avatar
                    </Button>
                  </label>
                  {user.avatar && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDeleteAvatar}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Status
                </CardTitle>
                <CardDescription>Current security configuration</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : securityStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rate Limiting</span>
                      <Badge variant={securityStatus.rate_limiting.enabled ? 'default' : 'secondary'}>
                        {securityStatus.rate_limiting.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CORS</span>
                      <Badge variant={securityStatus.cors.enabled ? 'default' : 'secondary'}>
                        {securityStatus.cors.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CSRF Protection</span>
                      <Badge variant={securityStatus.csrf.enabled ? 'default' : 'secondary'}>
                        {securityStatus.csrf.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">XSS Protection</span>
                      <Badge variant={securityStatus.headers.xss_protection ? 'default' : 'secondary'}>
                        {securityStatus.headers.xss_protection ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Max request size: {securityStatus.request_limits.max_size_mb}MB
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load security status</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/profile/edit')}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/profile/change-password')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/profile/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
