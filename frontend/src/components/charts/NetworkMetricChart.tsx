'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';

interface NetworkMetricChartProps {
  data: Array<{ 
    timestamp: string; 
    network: { 
      bytes_sent: number; 
      bytes_recv: number; 
      packets_sent: number; 
      packets_recv: number; 
    } 
  }>;
  className?: string;
}

export function NetworkMetricChart({ data, className }: NetworkMetricChartProps) {
  const latestData = data.length > 0 ? data[data.length - 1]?.network : null;
  
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatBytesPerSecond = (bytes: number) => {
    return `${formatBytes(bytes)}/s`;
  };

  return (
    <Card className={`group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 rounded-t-lg border-b border-white/20">
        <CardTitle className="flex items-center text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">
          <div className="relative mr-3">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg blur-sm opacity-30"></div>
            <div className="relative w-8 h-8 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
              <Network className="h-4 w-4 text-white" />
            </div>
          </div>
          Network Activity
        </CardTitle>
        <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          Real-time network I/O statistics
        </CardDescription>
      </CardHeader>

      <CardContent className="relative py-6">
        {/* Current stats display */}
        {latestData && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Data Sent</p>
                  <p className="text-lg font-bold text-blue-800">
                    {formatBytesPerSecond(latestData.bytes_sent)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-500">Packets</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {latestData.packets_sent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Data Received</p>
                  <p className="text-lg font-bold text-green-800">
                    {formatBytesPerSecond(latestData.bytes_recv)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-500">Packets</p>
                  <p className="text-sm font-semibold text-green-700">
                    {latestData.packets_recv.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="space-y-6">
          {/* Data transfer chart */}
          <div className="h-64 w-full">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Data Transfer Rate</h4>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="recvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatBytes(value)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm text-gray-600">
                            {new Date(label).toLocaleTimeString()}
                          </p>
                          {payload.map((entry, index) => (
                            <p key={index} className={`text-sm font-semibold ${
                              entry.dataKey === 'bytes_sent' ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {entry.dataKey === 'bytes_sent' ? 'Sent' : 'Received'}: {formatBytes(entry.value as number)}/s
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bytes_sent"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="url(#sentGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="bytes_recv"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#recvGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Packet transfer chart */}
          <div className="h-48 w-full">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Packet Transfer Rate</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm text-gray-600">
                            {new Date(label).toLocaleTimeString()}
                          </p>
                          {payload.map((entry, index) => (
                            <p key={index} className={`text-sm font-semibold ${
                              entry.dataKey === 'packets_sent' ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {entry.dataKey === 'packets_sent' ? 'Packets Sent' : 'Packets Received'}: {(entry.value as number).toLocaleString()}/s
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="packets_sent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="packets_recv"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary stats */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-500">Total Sent</p>
              <p className="text-sm font-semibold text-blue-700">
                {formatBytes(data.reduce((sum, d) => sum + d.network.bytes_sent, 0))}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-green-500">Total Received</p>
              <p className="text-sm font-semibold text-green-700">
                {formatBytes(data.reduce((sum, d) => sum + d.network.bytes_recv, 0))}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-500">Packets Sent</p>
              <p className="text-sm font-semibold text-purple-700">
                {data.reduce((sum, d) => sum + d.network.packets_sent, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-500">Packets Received</p>
              <p className="text-sm font-semibold text-orange-700">
                {data.reduce((sum, d) => sum + d.network.packets_recv, 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
