'use client';

import React, { useState, useEffect } from 'react';
import { commandAPI, Command } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Folder,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CommandHistoryProps {
  userId?: number;
  limit?: number;
  showUser?: boolean;
}

export function CommandHistory({ userId, limit = 20, showUser = true }: CommandHistoryProps) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadCommandHistory();
  }, [currentPage, userId]);

  const loadCommandHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commandAPI.getCommandHistory(currentPage, limit);
      setCommands(response.data.data || []);
      setTotalPages(response.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load command history');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommands = commands.filter(command => {
    const matchesSearch = command.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         command.args.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         command.output.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'success' && command.exit_code === 0) ||
                         (statusFilter === 'failed' && command.exit_code !== 0);
    
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (exitCode: number) => {
    return exitCode === 0 ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (exitCode: number) => {
    return exitCode === 0 ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    loadCommandHistory();
  };

  if (loading && commands.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-600">Loading command history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <CardTitle>Command History</CardTitle>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          View and search through your command execution history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search commands, arguments, or output..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('success')}
              className="text-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Success
            </Button>
            <Button
              variant={statusFilter === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('failed')}
              className="text-red-600"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Failed
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Commands List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No commands found</p>
                <p className="text-sm">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No commands have been executed yet'
                  }
                </p>
              </div>
            ) : (
              filteredCommands.map((command) => (
                <div
                  key={command.id}
                  className="p-4 bg-white/50 rounded-lg border border-slate-200 hover:bg-white/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                          {command.command} {command.args}
                        </code>
                        {getStatusBadge(command.exit_code)}
                      </div>
                      <div className="text-xs text-slate-500 space-x-4 flex flex-wrap">
                        {showUser && command.user && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{command.user.username}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Folder className="w-3 h-3" />
                          <span>{command.working_dir}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(command.created_at)}</span>
                        </span>
                        <span>Duration: {formatDuration(command.duration)}</span>
                        <span>Exit Code: {command.exit_code}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusIcon(command.exit_code)}
                    </div>
                  </div>
                  {command.output && (
                    <div className="mt-3 p-3 bg-slate-900 text-green-400 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {command.output}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
