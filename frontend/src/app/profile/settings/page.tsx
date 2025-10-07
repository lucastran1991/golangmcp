'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account preferences and security settings
          </p>
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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/profile/edit')}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/profile/change-password')}
                className="flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>Change Password</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/profile/avatar')}
                className="flex items-center space-x-2"
              >
                <Globe className="h-4 w-4" />
                <span>Upload Avatar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Active Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions && sessions.length > 0 ? sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{session.user_agent}</p>
                      <p className="text-sm text-gray-500">
                        IP: {session.ip_address} • 
                        Last active: {new Date(session.last_seen).toLocaleString()}
                        {session.is_active && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Active Session
                          </span>
                        )}
                      </p>
                    </div>
                    {session.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvalidateSession(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active sessions found
                  </p>
                )}
                
                {sessions && sessions.length > 1 && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleInvalidateAllSessions}
                      className="w-full"
                    >
                      Revoke All Other Sessions
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="lg:col-span-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <Shield className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">Logout</h4>
                  <p className="text-sm text-red-700">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">Delete Account</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Settings Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Account</CardTitle>
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
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
