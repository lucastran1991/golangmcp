'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { profileAPI, authAPI } from '@/lib/api';

export default function TestAvatarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('newuser123');
  const [password, setPassword] = useState('password123');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await authAPI.login({ username, password });
      console.log('Login response:', response);
      
      // Store token and user data
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setIsLoggedIn(true);
      setSuccess('Logged in successfully!');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Uploading file:', file.name, file.type, file.size);
      
      const response = await profileAPI.uploadAvatar(file);
      console.log('Upload response:', response);
      
      setSuccess('Avatar uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setSuccess('Logged out successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Avatar Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {!isLoggedIn ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button 
                onClick={handleLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-green-600 mb-4">✅ Logged in as {username}</p>
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full"
                >
                  Logout
                </Button>
              </div>
              
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              
              <Button 
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Uploading...' : 'Select Image to Upload'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}