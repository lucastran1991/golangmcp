'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MaterialButton } from '@/components/ui/material-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, Bell, Shield, Eye, Globe, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { profileAPI, authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserSessions {
  id: string;
  user_id: number;
  username: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
  last_seen: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSessions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: false,
    marketing_emails: false,
    profile_visibility: 'public',
    two_factor_enabled: false,
    session_timeout: 30,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSettings();
    loadSessions();
  }, [user, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch user settings from the backend
      // For now, we'll use default values
      setSettings({
        email_notifications: true,
        push_notifications: false,
        marketing_emails: false,
        profile_visibility: 'public',
        two_factor_enabled: false,
        session_timeout: 30,
      });
    } catch (err: any) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await profileAPI.getSessions();
      // Backend returns {count: number, sessions: UserSessions[]}
      setSessions(response.data.sessions || []);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setSessions([]); // Ensure sessions is always an array
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // In a real app, you'd save settings to the backend
      // await profileAPI.updateSettings(settings);
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateSession = async (sessionId: string) => {
    try {
      await profileAPI.invalidateSession(sessionId);
      setSuccess('Session invalidated successfully');
      loadSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to invalidate session');
    }
  };

  const handleInvalidateAllSessions = async () => {
    try {
      await profileAPI.invalidateAllSessions();
      setSuccess('All sessions invalidated successfully');
      loadSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to invalidate all sessions');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    try {
      setLoading(true);
      // In a real app, you'd call the delete account API
      // await profileAPI.deleteAccount();
      
      setSuccess('Account deletion initiated. You will be logged out shortly.');
      setTimeout(() => {
        logout?.();
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout?.();
      router.push('/');
    } catch (err: any) {
      console.error('Logout error:', err);
      logout?.();
      router.push('/');
    }
  };

  if (loading && !sessions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-gray-700 font-medium">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <MaterialButton
              variant="outlined"
              size="small"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </MaterialButton>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Account Settings
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage your account preferences and security settings with our modern interface
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800 mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Quick Navigation */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <MaterialButton
                onClick={() => router.push('/profile/edit')}
                variant="primary"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Edit Profile</span>
              </MaterialButton>
              <MaterialButton
                onClick={() => router.push('/profile/change-password')}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>Change Password</span>
              </MaterialButton>
              <MaterialButton
                onClick={() => router.push('/profile/avatar')}
                variant="info"
                className="flex items-center space-x-2"
              >
                <Globe className="h-4 w-4" />
                <span>Upload Avatar</span>
              </MaterialButton>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => handleSettingChange('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_notifications">Push Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push_notifications"
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) => handleSettingChange('push_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing_emails">Marketing Emails</Label>
                  <p className="text-sm text-gray-500">
                    Receive promotional content and updates
                  </p>
                </div>
                <Switch
                  id="marketing_emails"
                  checked={settings.marketing_emails}
                  onCheckedChange={(checked) => handleSettingChange('marketing_emails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <span>Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile_visibility">Profile Visibility</Label>
                <select
                  id="profile_visibility"
                  value={settings.profile_visibility}
                  onChange={(e) => handleSettingChange('profile_visibility', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  min="5"
                  max="480"
                  value={settings.session_timeout}
                  onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two_factor_enabled">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  id="two_factor_enabled"
                  checked={settings.two_factor_enabled}
                  onCheckedChange={(checked) => handleSettingChange('two_factor_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.01]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span>Active Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions && sessions.length > 0 ? sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-800">{session.user_agent}</p>
                      <p className="text-sm text-gray-600">
                        IP: {session.ip_address} • 
                        Last active: {new Date(session.last_seen).toLocaleString()}
                        {session.is_active && (
                          <span className="ml-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs rounded-full font-medium shadow-sm">
                            Active Session
                          </span>
                        )}
                      </p>
                    </div>
                    {session.is_active && (
                      <MaterialButton
                        variant="error"
                        size="small"
                        onClick={() => handleInvalidateSession(session.id)}
                      >
                        Revoke
                      </MaterialButton>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active sessions found
                  </p>
                )}
                
                {sessions && sessions.length > 1 && (
                  <div className="pt-4 border-t border-white/30">
                    <MaterialButton
                      onClick={handleInvalidateAllSessions}
                      variant="warning"
                      className="w-full"
                    >
                      Revoke All Other Sessions
                    </MaterialButton>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="lg:col-span-2 bg-red-50/80 backdrop-blur-sm border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200">
                <div>
                  <h4 className="font-medium text-red-900">Logout</h4>
                  <p className="text-sm text-red-700">
                    Sign out of your account on this device
                  </p>
                </div>
                <MaterialButton
                  onClick={handleLogout}
                  variant="error"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </MaterialButton>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200">
                <div>
                  <h4 className="font-medium text-red-900">Delete Account</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <MaterialButton
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </MaterialButton>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Settings Button */}
        <div className="mt-8 flex justify-center">
          <MaterialButton
            onClick={handleSaveSettings}
            disabled={loading}
            loading={loading}
            variant="primary"
            className="min-w-[160px]"
          >
            Save Settings
          </MaterialButton>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center space-x-2">
                  <div className="p-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span>Delete Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  This action cannot be undone. This will permanently delete your account
                  and remove all data from our servers.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete_confirm">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="delete_confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono"
                  />
                </div>
                <div className="flex space-x-3">
                  <MaterialButton
                    variant="outlined"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </MaterialButton>
                  <MaterialButton
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || loading}
                    loading={loading}
                    variant="error"
                    className="flex-1"
                  >
                    Delete Account
                  </MaterialButton>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
