'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MaterialButton } from '@/components/ui/material-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { filesAPI, FileStats } from '@/lib/api';
import type { File } from '@/lib/api';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  FileSpreadsheet, 
  File as FileIcon,
  MoreHorizontal,
  Calendar,
  User,
  HardDrive,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface FileListProps {
  className?: string;
  onFileSelect?: (file: File) => void;
  onFileDelete?: (file: File) => void;
}

export function FileList({ className, onFileSelect, onFileDelete }: FileListProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchFiles();
  }, [debouncedSearchQuery, filterType]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit: 50 };
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (filterType) params.type = filterType;
      
      const response = await filesAPI.getFiles(params);
      setFiles(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(err.response?.data?.error || 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await filesAPI.getFileStats();
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch file stats:', err);
      if (err.response?.status === 429) {
        console.warn('Rate limited while fetching stats, will retry later');
        // Retry after a delay
        setTimeout(() => {
          fetchStats();
        }, 60000); // Retry after 1 minute
      }
    }
  };

  const handleDelete = async (file: File) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
      return;
    }

    try {
      setDeletingId(file.id);
      await filesAPI.deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      
      if (onFileDelete) {
        onFileDelete(file);
      }
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      setError(err.response?.data?.error || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: File) => {
    try {
      const response = await filesAPI.downloadFile(file.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download file:', err);
      setError(err.response?.data?.error || 'Failed to download file');
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'txt':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'csv':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
          <p className="text-gray-600">Manage your uploaded files</p>
        </div>
        
        {stats && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_files}</p>
            <p className="text-xs text-gray-500">
              {(stats.total_size / (1024 * 1024)).toFixed(1)} MB total
            </p>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="txt">TXT</option>
            <option value="xlsx">XLSX</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Files List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="py-12 text-center">
            <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {searchQuery || filterType 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Upload your first file to get started.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card 
              key={file.id} 
              className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {file.original_name}
                      </h3>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <HardDrive className="h-4 w-4" />
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{file.user.username}</span>
                        </div>
                      </div>
                      
                      {file.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {file.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {file.file_type.toUpperCase()}
                        </Badge>
                        
                        {file.is_public && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            Public
                          </Badge>
                        )}
                        
                        {file.tags && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.split(',').slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                            {file.tags.split(',').length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{file.tags.split(',').length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MaterialButton
                      variant="text"
                      size="small"
                      icon
                      onClick={() => handleDownload(file)}
                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                    >
                      <Download className="h-4 w-4" />
                    </MaterialButton>
                    
                    <MaterialButton
                      variant="text"
                      size="small"
                      icon
                      onClick={() => onFileSelect?.(file)}
                      className="h-8 w-8 text-gray-400 hover:text-green-600"
                    >
                      <Eye className="h-4 w-4" />
                    </MaterialButton>
                    
                    <MaterialButton
                      variant="text"
                      size="small"
                      icon
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      loading={deletingId === file.id}
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </MaterialButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
