'use client';

import React, { useState, useEffect } from 'react';
import { commandAPI, CommandWhitelist, AddToWhitelistRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Settings,
  Info
} from 'lucide-react';

export function CommandWhitelist() {
  const [whitelist, setWhitelist] = useState<CommandWhitelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandWhitelist | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    command: '',
    description: '',
    allowed_args: '',
    max_duration: 30000,
  });

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commandAPI.getWhitelist();
      setWhitelist(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load command whitelist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommand = async () => {
    try {
      setError(null);
      setSuccess(null);

      const allowedArgs = formData.allowed_args.trim() 
        ? formData.allowed_args.split(',').map(arg => arg.trim()).filter(Boolean)
        : undefined;

      const requestData: AddToWhitelistRequest = {
        command: formData.command.trim(),
        description: formData.description.trim(),
        allowed_args: allowedArgs,
        max_duration: formData.max_duration,
      };

      await commandAPI.addToWhitelist(requestData);
      setSuccess('Command added to whitelist successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadWhitelist();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add command to whitelist');
    }
  };

  const handleRemoveCommand = async (command: string) => {
    if (!confirm(`Are you sure you want to remove "${command}" from the whitelist?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await commandAPI.removeFromWhitelist(command);
      setSuccess('Command removed from whitelist successfully');
      loadWhitelist();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove command from whitelist');
    }
  };

  const handleInitializeWhitelist = async () => {
    if (!confirm('This will initialize the whitelist with default safe commands. Continue?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await commandAPI.initializeWhitelist();
      setSuccess('Whitelist initialized with default commands');
      loadWhitelist();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize whitelist');
    }
  };

  const resetForm = () => {
    setFormData({
      command: '',
      description: '',
      allowed_args: '',
      max_duration: 30000,
    });
  };

  const openEditDialog = (command: CommandWhitelist) => {
    setEditingCommand(command);
    setFormData({
      command: command.command,
      description: command.description,
      allowed_args: command.allowed_args ? JSON.parse(command.allowed_args).join(', ') : '',
      max_duration: command.max_duration,
    });
    setIsEditDialogOpen(true);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge> : 
      <Badge variant="secondary">Inactive</Badge>;
  };

  if (loading && whitelist.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-600">Loading command whitelist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Command Whitelist Management</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={loadWhitelist}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleInitializeWhitelist}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Initialize Defaults
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Command
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Command to Whitelist</DialogTitle>
                    <DialogDescription>
                      Add a new command to the whitelist with security restrictions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="command">Command *</Label>
                      <Input
                        id="command"
                        value={formData.command}
                        onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                        placeholder="e.g., ls, ps, whoami"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of what this command does"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="allowed_args">Allowed Arguments</Label>
                      <Input
                        id="allowed_args"
                        value={formData.allowed_args}
                        onChange={(e) => setFormData({ ...formData, allowed_args: e.target.value })}
                        placeholder="e.g., -la, --help, /path (comma-separated)"
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Leave empty to allow all arguments
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="max_duration">Max Duration (ms)</Label>
                      <Input
                        id="max_duration"
                        type="number"
                        value={formData.max_duration}
                        onChange={(e) => setFormData({ ...formData, max_duration: parseInt(e.target.value) || 30000 })}
                        min="1000"
                        max="300000"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum execution time in milliseconds (1000ms = 1s)
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddCommand}
                        disabled={!formData.command.trim() || !formData.description.trim()}
                      >
                        Add Command
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>
            Manage which commands are allowed to be executed for security
          </CardDescription>
        </CardHeader>
      </Card>

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

      {/* Whitelist Table */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <div className="space-y-0">
              {whitelist.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No commands in whitelist</p>
                  <p className="text-sm">Add commands or initialize with defaults</p>
                </div>
              ) : (
                whitelist.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                            {item.command}
                          </code>
                          {getStatusBadge(item.is_active)}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                        <div className="text-xs text-slate-500 space-x-4">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Max Duration: {formatDuration(item.max_duration)}</span>
                          </span>
                          {item.allowed_args && (
                            <span>
                              Allowed Args: {JSON.parse(item.allowed_args).join(', ')}
                            </span>
                          )}
                          <span>Created: {formatDate(item.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveCommand(item.command)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Security Information</p>
              <ul className="space-y-1 text-xs">
                <li>• Only whitelisted commands can be executed</li>
                <li>• Commands are validated against allowed arguments</li>
                <li>• Execution time is limited by max duration setting</li>
                <li>• All command executions are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
