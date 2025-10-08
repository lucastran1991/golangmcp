'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';

interface DiskMetricChartProps {
  data: Array<{ timestamp: string; disk: number }>;
  devices?: Array<{ device: string; usage: number; total: number; used: number; free: number }>;
  className?: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function DiskMetricChart({ data, devices = [], className }: DiskMetricChartProps) {
  const latestValue = data.length > 0 ? data[data.length - 1]?.disk : 0;
  
  const getStatusColor = (value: number) => {
    if (value >= 95) return 'text-red-500';
    if (value >= 85) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusBg = (value: number) => {
    if (value >= 95) return 'bg-red-50 border-red-200';
    if (value >= 85) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  // Prepare pie chart data
  const pieData = devices.map((device, index) => ({
    name: device.device,
    value: device.usage,
    total: device.total,
    used: device.used,
    free: device.free,
    color: COLORS[index % COLORS.length]
  }));

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Card className={`group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-lg border-b border-white/20">
        <CardTitle className="flex items-center text-gray-800 group-hover:text-purple-600 transition-colors duration-300">
          <div className="relative mr-3">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-sm opacity-30"></div>
            <div className="relative w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
              <HardDrive className="h-4 w-4 text-white" />
            </div>
          </div>
          Disk Usage
        </CardTitle>
        <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          Real-time disk utilization and device breakdown
        </CardDescription>
      </CardHeader>

      <CardContent className="relative py-6">
        {/* Current value display */}
        <div className={`mb-4 p-4 rounded-lg border-2 ${getStatusBg(latestValue)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Usage</p>
              <p className={`text-3xl font-bold ${getStatusColor(latestValue)}`}>
                {latestValue.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <p className={`text-sm font-medium ${getStatusColor(latestValue)}`}>
                {latestValue >= 95 ? 'Critical' : latestValue >= 85 ? 'Warning' : 'Normal'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage over time chart */}
          <div className="h-64 w-full">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Usage Over Time</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(-10)}> {/* Show last 10 data points */}
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm text-gray-600">
                            {new Date(label).toLocaleTimeString()}
                          </p>
                          <p className="text-lg font-semibold text-purple-600">
                            Disk: {payload[0].value?.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="disk" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device breakdown pie chart */}
          <div className="h-64 w-full">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Device Breakdown</h4>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="text-sm font-semibold text-gray-800">{data.name}</p>
                            <p className="text-sm text-gray-600">Usage: {data.value.toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">Used: {formatBytes(data.used)}</p>
                            <p className="text-xs text-gray-500">Free: {formatBytes(data.free)}</p>
                            <p className="text-xs text-gray-500">Total: {formatBytes(data.total)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-sm">No device data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Device list */}
        {devices.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Device Details</h4>
            <div className="space-y-2">
              {devices.map((device, index) => (
                <div key={device.device} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{device.device}</p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(device.used)} / {formatBytes(device.total)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{device.usage.toFixed(1)}%</p>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${device.usage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
