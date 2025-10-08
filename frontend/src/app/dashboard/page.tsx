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
  const { user, logout } = useAuth();
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


  const handleDeleteAvatar = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Deleting avatar...');
      const response = await profileAPI.deleteAvatar();
      console.log('Delete response:', response.data);
      
      setSuccess('Avatar deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload the page to update the UI
      window.location.reload();
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-sm"
              >
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
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                  Profile
                </CardTitle>
                <CardDescription className="text-gray-600">Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-4 ring-white/50 shadow-lg">
                      <AvatarImage 
                        src={user.avatar ? `http://localhost:8080${user.avatar}` : undefined}
                        className="object-cover object-center"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg flex items-center justify-center">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray shadow-lg"></div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-800">{user.username}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                      className={`${
                        user.role === 'admin' 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                      } shadow-sm`}
                    >
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
                  <Button 
                    size="sm" 
                    onClick={() => router.push('/profile/avatar')}
                    className="z-50 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Avatar
                  </Button>
                  {user.avatar && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleDeleteAvatar}
                      disabled={loading}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Status Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  Security Status
                </CardTitle>
                <CardDescription className="text-gray-600">Current security configuration</CardDescription>
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
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center mr-3">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-600">Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/profile/edit')}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/profile/change-password')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200"
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
