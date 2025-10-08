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
  CheckCircle,
  Sparkles,
  Zap,
  Star,
  Heart,
  TrendingUp,
  Activity
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Enhanced background with animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-blue-400/40 to-purple-400/40 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
          
          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
              backgroundSize: '20px 20px',
              animation: 'pulse 4s ease-in-out infinite'
            }}></div>
          </div>
        </div>
      {/* Enhanced Header */}
      <header className="relative bg-white/90 backdrop-blur-md shadow-xl border-b border-white/30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-6">
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600 font-medium">Welcome back, {user?.username}!</p>
              </div>
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

      <div className="relative z-10 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
            {/* Enhanced User Profile Card */}
            <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg border-b border-white/20">
                <CardTitle className="flex items-center text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-12">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="group-hover:animate-pulse">Profile</span>
                </CardTitle>
                <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative group/avatar">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-30 group-hover/avatar:opacity-50 transition-opacity duration-300"></div>
                    <Avatar className="relative h-20 w-20 ring-4 ring-white/60 shadow-2xl group-hover/avatar:shadow-3xl transition-all duration-300 group-hover/avatar:scale-110">
                      <AvatarImage 
                        src={user.avatar ? `http://localhost:8080${user.avatar}` : undefined}
                        className="object-cover object-center"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-xl flex items-center justify-center">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-lg animate-pulse">
                      <div className="w-full h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping"></div>
                    </div>
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

                <div className="flex space-x-3">
                  <Button 
                    size="sm" 
                    onClick={() => router.push('/profile/avatar')}
                    className="relative z-50 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group/upload"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-md blur-sm opacity-0 group-hover/upload:opacity-50 transition-opacity duration-300"></div>
                    <Upload className="h-4 w-4 mr-2 relative group-hover/upload:animate-bounce" />
                    <span className="relative">Upload Avatar</span>
                  </Button>
                  {user.avatar && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleDeleteAvatar}
                      disabled={loading}
                      className="relative border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 group/delete"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-md blur-sm opacity-0 group-hover/delete:opacity-20 transition-opacity duration-300"></div>
                      <Trash2 className="h-4 w-4 mr-2 relative group-hover/delete:animate-pulse" />
                      <span className="relative">Remove</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Security Status Card */}
            <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg border-b border-white/20">
                <CardTitle className="flex items-center text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-12">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="group-hover:animate-pulse">Security Status</span>
                </CardTitle>
                <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">Current security configuration</CardDescription>
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

            {/* Enhanced Quick Actions Card */}
            <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-t-lg border-b border-white/20">
                <CardTitle className="flex items-center text-gray-800 group-hover:text-orange-600 transition-colors duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-12">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="group-hover:animate-pulse">Quick Actions</span>
                </CardTitle>
                <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative">
                <Button 
                  variant="outline" 
                  className="group/btn w-full justify-start border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 relative overflow-hidden"
                  onClick={() => router.push('/profile/edit')}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300"></div>
                  <UserIcon className="h-4 w-4 mr-3 relative group-hover/btn:animate-pulse" />
                  <span className="relative">Edit Profile</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="group/btn w-full justify-start border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 relative overflow-hidden"
                  onClick={() => router.push('/profile/change-password')}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300"></div>
                  <Shield className="h-4 w-4 mr-3 relative group-hover/btn:animate-pulse" />
                  <span className="relative">Change Password</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="group/btn w-full justify-start border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 relative overflow-hidden"
                  onClick={() => router.push('/profile/settings')}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300"></div>
                  <Settings className="h-4 w-4 mr-3 relative group-hover/btn:animate-pulse" />
                  <span className="relative">Account Settings</span>
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
