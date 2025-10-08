'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  CheckCircle, 
  Image as ImageIcon, 
  ArrowLeft,
  Loader2,
  Trash2
} from 'lucide-react';
import { profileAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AvatarUploadPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      } else {
        setError('Please select an image file');
      }
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccess(null);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Uploading avatar:', selectedFile.name);
      const response = await profileAPI.uploadAvatar(selectedFile);
      console.log('Upload response:', response.data);
      
      // Update user data in context
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setSuccess('Avatar uploaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset form
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
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
      setSuccess(null);
      
      console.log('Deleting avatar...');
      const response = await profileAPI.deleteAvatar();
      console.log('Delete response:', response.data);
      
      // Update user data in context
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

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-4 hover:bg-white/50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Upload Avatar
              </h1>
            </div>
          </div>
          <p className="text-gray-600 ml-13">
            Upload a new profile picture or drag and drop an image below
          </p>
        </div>

        {/* Current Avatar */}
        {user?.avatar && (
          <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
              <CardTitle className="text-lg text-gray-800">Current Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img 
                    src={`http://localhost:8080${user.avatar}`} 
                    alt="Current Avatar" 
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-white/50 shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray shadow-lg"></div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current profile picture</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeleteAvatar}
                    disabled={loading}
                    className="mt-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Current
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Area */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
            <CardTitle className="text-lg text-gray-800">Upload New Avatar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Drag and Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50 hover:shadow-md'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {preview ? (
                <div className="space-y-4">
                  <div className="relative mx-auto w-32 h-32">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover ring-4 ring-white/50 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <Button
                      onClick={handleUpload}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Avatar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearSelection}
                      disabled={loading}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg">
                    <ImageIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your image here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse files
                    </p>
                  </div>
                  <Button
                    onClick={openFileDialog}
                    variant="outline"
                    disabled={loading}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* File Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Supported formats: JPG, PNG, GIF, WebP</p>
              <p>• Maximum file size: 5MB</p>
              <p>• Recommended size: 200x200 pixels or larger</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
