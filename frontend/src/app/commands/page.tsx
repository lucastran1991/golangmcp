'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { commandAPI, Command, CommandStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MaterialButton } from '@/components/ui/material-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Terminal, Play, History, Settings, AlertCircle, CheckCircle, Clock, User, Folder } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommandExecution {
  id: number;
  command: string;
  args: string;
  output: string;
  exitCode: number;
  duration: number;
  workingDir: string;
  createdAt: string;
  isExecuting?: boolean;
}

export default function CommandsPage() {
  const { user } = useAuth();
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [workingDir, setWorkingDir] = useState('/tmp');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [stats, setStats] = useState<CommandStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadCommandHistory();
      loadCommandStats();
    }
  }, [user]);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [executions]);

  const loadCommandHistory = async () => {
    try {
      const response = await commandAPI.getCommandHistory(1, 50);
      setExecutions(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load command history:', err);
    }
  };

  const loadCommandStats = async () => {
    try {
      const response = await commandAPI.getCommandStats();
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to load command stats:', err);
    }
  };

  const executeCommand = async () => {
    if (!user) {
      setError('Please log in to execute commands');
      return;
    }

    if (!command.trim()) {
      setError('Please enter a command');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    // Add to executions immediately for real-time feedback
    const tempExecution: CommandExecution = {
      id: Date.now(), // Temporary ID
      command: command.trim(),
      args: args.trim(),
      output: 'Executing...',
      exitCode: 0,
      duration: 0,
      workingDir: workingDir.trim() || '/tmp',
      createdAt: new Date().toISOString(),
      isExecuting: true,
    };

    setExecutions(prev => [tempExecution, ...prev]);

    try {
      const argsArray = args.trim() ? args.trim().split(/\s+/) : [];
      const response = await commandAPI.executeCommand({
        command: command.trim(),
        args: argsArray,
        working_dir: workingDir.trim() || '/tmp',
      });

      const result = response.data.data;
      
      // Update the temporary execution with real data
      setExecutions(prev => prev.map(exec => 
        exec.id === tempExecution.id 
          ? {
              ...result,
              isExecuting: false,
            }
          : exec
      ));

      setSuccess('Command executed successfully');
      setCommand('');
      setArgs('');
      
      // Reload stats
      loadCommandStats();
    } catch (err: any) {
      // Update the temporary execution with error
      setExecutions(prev => prev.map(exec => 
        exec.id === tempExecution.id 
          ? {
              ...exec,
              output: `Error: ${err.response?.data?.error || err.message}`,
              exitCode: 1,
              isExecuting: false,
            }
          : exec
      ));

      setError(err.response?.data?.error || 'Failed to execute command');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (exitCode: number, isExecuting?: boolean) => {
    if (isExecuting) {
      return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    return exitCode === 0 ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (exitCode: number, isExecuting?: boolean) => {
    if (isExecuting) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Executing</Badge>;
    }
    return exitCode === 0 ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Command Terminal
            </h1>
            <p className="text-slate-600 text-lg">
              Execute shell commands securely with real-time output
            </p>
            {!user && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  Please log in to access the command terminal and execute shell commands.
                </p>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-slate-600">Total Commands</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.total_commands}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-600">Successful</p>
                      <p className="text-2xl font-bold text-green-600">{stats.successful_commands}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm text-slate-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{stats.failed_commands}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-slate-600">Avg Duration</p>
                      <p className="text-2xl font-bold text-purple-600">{formatDuration(stats.average_duration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="terminal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm">
              <TabsTrigger value="terminal" className="flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>Terminal</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Terminal Tab */}
            <TabsContent value="terminal" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Terminal className="w-5 h-5" />
                    <span>Command Execution</span>
                  </CardTitle>
                  <CardDescription>
                    Execute shell commands with real-time output and security validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Command Input */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Command *
                        </label>
                        <Input
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="e.g., ls, ps, whoami"
                          className="font-mono"
                          disabled={isExecuting || !user}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Working Directory
                        </label>
                        <Input
                          value={workingDir}
                          onChange={(e) => setWorkingDir(e.target.value)}
                          placeholder="/tmp"
                          className="font-mono"
                          disabled={isExecuting || !user}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Arguments (space-separated)
                      </label>
                      <Input
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., -la, --help, /path/to/file"
                        className="font-mono"
                        disabled={isExecuting || !user}
                      />
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="flex justify-end">
                    <MaterialButton
                      onClick={executeCommand}
                      disabled={isExecuting || !command.trim() || !user}
                      loading={isExecuting}
                      variant="primary"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Execute Command
                    </MaterialButton>
                  </div>

                  {/* Alerts */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Terminal Output */}
              <Card className="bg-slate-900 text-green-400 border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-green-400 text-sm font-mono">
                    Terminal Output
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea ref={terminalRef} className="h-96 p-4">
                    <div className="space-y-2 font-mono text-sm">
                      {executions.length === 0 ? (
                        <div className="text-slate-500 italic">
                          No commands executed yet. Enter a command above to get started.
                        </div>
                      ) : (
                        executions.map((execution) => (
                          <div key={execution.id} className="space-y-2">
                            <div className="flex items-center space-x-2 text-slate-300">
                              <span className="text-green-400">$</span>
                              <span>{execution.command}</span>
                              {execution.args && <span>{execution.args}</span>}
                              <span className="text-slate-500">in {execution.workingDir}</span>
                              {getStatusIcon(execution.exitCode, execution.isExecuting)}
                            </div>
                            <div className="ml-4 text-slate-400">
                              <pre className="whitespace-pre-wrap break-words">
                                {execution.output}
                              </pre>
                            </div>
                            <div className="ml-4 text-xs text-slate-500 flex items-center space-x-4">
                              <span>Exit Code: {execution.exitCode}</span>
                              <span>Duration: {formatDuration(execution.duration)}</span>
                              <span>Time: {formatDate(execution.createdAt)}</span>
                            </div>
                            <div className="border-b border-slate-700"></div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5" />
                    <span>Command History</span>
                  </CardTitle>
                  <CardDescription>
                    View and manage your command execution history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {executions.map((execution) => (
                        <div
                          key={execution.id}
                          className="p-4 bg-white/50 rounded-lg border border-slate-200 hover:bg-white/70 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                                  {execution.command} {execution.args}
                                </code>
                                {getStatusBadge(execution.exitCode, execution.isExecuting)}
                              </div>
                              <div className="text-xs text-slate-500 space-x-4">
                                <span className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{execution.user?.username || 'Unknown'}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Folder className="w-3 h-3" />
                                  <span>{execution.workingDir}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(execution.createdAt)}</span>
                                </span>
                                <span>Duration: {formatDuration(execution.duration)}</span>
                              </div>
                            </div>
                          </div>
                          {execution.output && (
                            <div className="mt-3 p-3 bg-slate-900 text-green-400 rounded font-mono text-xs">
                              <pre className="whitespace-pre-wrap break-words">
                                {execution.output}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Command Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Configure command execution settings and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        Command execution is restricted to whitelisted commands for security. 
                        Contact your administrator to add new commands to the whitelist.
                      </AlertDescription>
                    </Alert>
                    <div className="text-sm text-slate-600">
                      <p><strong>Current User:</strong> {user?.username}</p>
                      <p><strong>Default Working Directory:</strong> /tmp</p>
                      <p><strong>Command Timeout:</strong> 30 seconds</p>
                      <p><strong>Security:</strong> Whitelist-based command validation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </LayoutWrapper>
  );
}
