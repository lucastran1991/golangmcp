'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MaterialButton } from '@/components/ui/material-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { filesAPI } from '@/lib/api';
import type { File } from '@/lib/api';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  File as FileIcon, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

const ALLOWED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'application/csv': ['.csv'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({ onUploadSuccess, onUploadError, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setSelectedFile(file);
    setUploadProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await filesAPI.uploadFile(
        selectedFile,
        description || undefined,
        tags || undefined,
        isPublic
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      const uploadedFile: File = response.data.data;
      setSuccess('File uploaded successfully!');
      
      if (onUploadSuccess) {
        onUploadSuccess(uploadedFile);
      }

      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setDescription('');
        setTags('');
        setIsPublic(false);
        setUploadProgress(0);
        setSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Upload failed:', err);
      const errorMessage = err.response?.data?.error || 'Upload failed';
      setError(errorMessage);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setDescription('');
    setTags('');
    setIsPublic(false);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
  };

  const getFileIcon = (file: globalThis.File) => {
    switch (file.type) {
      case 'text/plain':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      case 'text/csv':
      case 'application/csv':
        return <FileText className="h-8 w-8 text-orange-500" />;
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={`group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg border-b border-white/20">
        <CardTitle className="flex items-center text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
          <div className="relative mr-3">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30"></div>
            <div className="relative w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <Upload className="h-4 w-4 text-white" />
            </div>
          </div>
          Upload Files
        </CardTitle>
        <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          Upload TXT, XLSX, or CSV files up to 50MB
        </CardDescription>
      </CardHeader>

      <CardContent className="relative py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* File Rejection Errors */}
        {fileRejections.length > 0 && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name}>
                  <strong>{file.name}:</strong> {errors.map(e => e.message).join(', ')}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
            ${selectedFile ? 'border-green-400 bg-green-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                {getFileIcon(selectedFile)}
                <div className="text-left">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <MaterialButton
                  variant="text"
                  size="small"
                  icon
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </MaterialButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to select a file
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports TXT, XLSX, CSV files up to 50MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File Details Form */}
        {selectedFile && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter file description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas..."
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="isPublic">Make file public</Label>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex space-x-3">
              <MaterialButton
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
                variant="primary"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </MaterialButton>
              
              <MaterialButton
                variant="outlined"
                onClick={clearFile}
                disabled={uploading}
              >
                Cancel
              </MaterialButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
