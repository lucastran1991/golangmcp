'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MemoryStick } from 'lucide-react';

interface MemoryMetricChartProps {
  data: Array<{ timestamp: string; memory: number }>;
  className?: string;
}

export function MemoryMetricChart({ data, className }: MemoryMetricChartProps) {
  const latestValue = data.length > 0 ? data[data.length - 1]?.memory : 0;
  
  const getStatusColor = (value: number) => {
    if (value >= 90) return 'text-red-500';
    if (value >= 80) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusBg = (value: number) => {
    if (value >= 90) return 'bg-red-50 border-red-200';
    if (value >= 80) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <Card className={`group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg border-b border-white/20">
        <CardTitle className="flex items-center text-gray-800 group-hover:text-green-600 transition-colors duration-300">
          <div className="relative mr-3">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur-sm opacity-30"></div>
            <div className="relative w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <MemoryStick className="h-4 w-4 text-white" />
            </div>
          </div>
          Memory Usage
        </CardTitle>
        <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          Real-time memory utilization percentage
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
                {latestValue >= 90 ? 'Critical' : latestValue >= 80 ? 'Warning' : 'Normal'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
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
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
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
                        <p className="text-lg font-semibold text-green-600">
                          Memory: {payload[0].value?.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#memoryGradient)"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Performance indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Min</p>
            <p className="text-sm font-semibold text-gray-700">
              {data.length > 0 ? Math.min(...data.map(d => d.memory)).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Max</p>
            <p className="text-sm font-semibold text-gray-700">
              {data.length > 0 ? Math.max(...data.map(d => d.memory)).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Avg</p>
            <p className="text-sm font-semibold text-gray-700">
              {data.length > 0 ? (data.reduce((sum, d) => sum + d.memory, 0) / data.length).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
