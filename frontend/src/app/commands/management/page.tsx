'use client';

import React from 'react';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { CommandWhitelist } from '@/components/commands/CommandWhitelist';
import { CommandHistory } from '@/components/commands/CommandHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, History, Settings } from 'lucide-react';

export default function CommandsManagementPage() {
  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Command Management
            </h1>
            <p className="text-slate-600 text-lg">
              Manage command whitelist and view execution history
            </p>
          </div>

          <Tabs defaultValue="whitelist" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm">
              <TabsTrigger value="whitelist" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Whitelist</span>
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

            {/* Whitelist Tab */}
            <TabsContent value="whitelist">
              <CommandWhitelist />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <CommandHistory showUser={true} limit={50} />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border-0 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Command Timeout:</span>
                        <span className="font-mono">30 seconds</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Default Working Directory:</span>
                        <span className="font-mono">/tmp</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Whitelist Validation:</span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Argument Validation:</span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border-0 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">System Information</h3>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Operating System:</span>
                        <span className="font-mono">Linux/Unix</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shell Environment:</span>
                        <span className="font-mono">Bash</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Concurrent Commands:</span>
                        <span className="font-mono">10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Log Retention:</span>
                        <span className="font-mono">30 days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border-0 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Default Whitelisted Commands</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'ls', 'pwd', 'whoami', 'date', 'uptime', 'ps', 'df', 'free',
                      'cat', 'head', 'tail', 'grep', 'find', 'which', 'echo', 'env'
                    ].map((cmd) => (
                      <div
                        key={cmd}
                        className="bg-slate-100 text-slate-700 px-3 py-2 rounded text-sm font-mono text-center"
                      >
                        {cmd}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </LayoutWrapper>
  );
}
