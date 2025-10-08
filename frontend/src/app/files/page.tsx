'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { FileUpload } from '@/components/files/FileUpload';
import { FileList } from '@/components/files/FileList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { File, FileStats } from '@/lib/api';
import { 
  Upload, 
  FolderOpen, 
  BarChart3, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function FilesPage() {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{left: string, top: string, animationDelay: string, animationDuration: string}>>([]);

  // Generate particles only on client side to avoid hydration mismatch
  React.useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${3 + Math.random() * 2}s`
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  const handleUploadSuccess = (file: File) => {
    setSuccess(`File "${file.original_name}" uploaded successfully!`);
    setShowUpload(false);
    setError(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUploadError = (error: string) => {
    setError(error);
    setSuccess(null);
    
    // Clear error message after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileDelete = (file: File) => {
    setSuccess(`File "${file.original_name}" deleted successfully!`);
    setSelectedFile(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <LayoutWrapper>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
          {/* Enhanced background with animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            {/* Floating particles */}
            {particles.map((particle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-green-400/40 to-emerald-400/40 rounded-full animate-bounce"
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.animationDelay,
                  animationDuration: particle.animationDuration
                }}
              />
            ))}
          </div>

          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    File Manager
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Upload, manage, and organize your files
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => setShowUpload(!showUpload)}
                    className="group/btn border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                    <Upload className="h-4 w-4 mr-2 relative" />
                    <span className="relative">
                      {showUpload ? 'Hide Upload' : 'Upload Files'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Success/Error Alerts */}
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Section */}
            {showUpload && (
              <div className="mb-8">
                <FileUpload
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>
            )}

            {/* File List */}
            <FileList
              onFileSelect={handleFileSelect}
              onFileDelete={handleFileDelete}
            />

            {/* Selected File Details */}
            {selectedFile && (
              <Card className="mt-8 group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg border-b border-white/20">
                  <CardTitle className="flex items-center text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30"></div>
                      <div className="relative w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                        <FolderOpen className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    File Details
                  </CardTitle>
                  <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    Detailed information about the selected file
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">File Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Name:</span>
                          <p className="font-medium text-gray-900">{selectedFile.original_name}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Type:</span>
                          <p className="font-medium text-gray-900">{selectedFile.file_type.toUpperCase()}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Size:</span>
                          <p className="font-medium text-gray-900">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Uploaded:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedFile.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Access & Privacy</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Owner:</span>
                          <p className="font-medium text-gray-900">{selectedFile.user.username}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Visibility:</span>
                          <p className="font-medium text-gray-900">
                            {selectedFile.is_public ? 'Public' : 'Private'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">File ID:</span>
                          <p className="font-medium text-gray-900 font-mono text-xs">{selectedFile.id}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Description & Tags</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Description:</span>
                          <p className="font-medium text-gray-900">
                            {selectedFile.description || 'No description provided'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Tags:</span>
                          <p className="font-medium text-gray-900">
                            {selectedFile.tags || 'No tags'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}
