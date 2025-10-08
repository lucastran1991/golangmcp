'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { CPUMetricChart } from '@/components/charts/CPUMetricChart';
import { MemoryMetricChart } from '@/components/charts/MemoryMetricChart';
import { DiskMetricChart } from '@/components/charts/DiskMetricChart';
import { NetworkMetricChart } from '@/components/charts/NetworkMetricChart';
import { metricsAPI, SystemMetrics, RealtimeMetrics } from '@/lib/api';
import { createMetricsWebSocket } from '@/lib/websocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Server, 
  Wifi, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function DeploymentPage() {
  const { user } = useAuth();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [particles, setParticles] = useState<Array<{left: string, top: string, animationDelay: string, animationDuration: string}>>([]);

  // Generate particles only on client side to avoid hydration mismatch
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${3 + Math.random() * 2}s`
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSystemMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await metricsAPI.getSystemMetrics();
        setSystemMetrics(response.data.data);
      } catch (err) {
        console.error('Failed to fetch system metrics:', err);
        setError('Failed to load system metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchSystemMetrics();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const ws = createMetricsWebSocket();
    
    ws.onMessage((data: RealtimeMetrics) => {
      setRealtimeData(prev => {
        const newData = [...prev, data];
        // Keep only last 60 data points (1 minute at 1-second intervals)
        return newData.slice(-60);
      });
    });

    ws.onError((error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    });

    ws.onClose(() => {
      setWsConnected(false);
    });

    ws.connect()
      .then(() => {
        setWsConnected(true);
        console.log('WebSocket connected for real-time metrics');
      })
      .catch((error) => {
        console.error('Failed to connect WebSocket:', error);
        setWsConnected(false);
      });

    return () => {
      ws.disconnect();
    };
  }, [user]);

  const refreshMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await metricsAPI.getSystemMetrics();
      setSystemMetrics(response.data.data);
    } catch (err) {
      console.error('Failed to refresh metrics:', err);
      setError('Failed to refresh metrics');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  // Prepare chart data
  const cpuChartData = realtimeData.map(d => ({
    timestamp: d.timestamp,
    cpu: d.cpu
  }));

  const memoryChartData = realtimeData.map(d => ({
    timestamp: d.timestamp,
    memory: d.memory
  }));

  const diskChartData = realtimeData.map(d => ({
    timestamp: d.timestamp,
    disk: d.disk
  }));

  const networkChartData = realtimeData.map(d => ({
    timestamp: d.timestamp,
    network: d.network
  }));

  return (
    <ProtectedRoute>
      <LayoutWrapper>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
          {/* Enhanced background with animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-400/10 to-rose-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            {/* Floating particles */}
            {particles.map((particle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-indigo-400/40 to-purple-400/40 rounded-full animate-bounce"
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    System Metrics
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Real-time monitoring and performance analytics
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Connection status */}
                  <div className="flex items-center space-x-2">
                    {wsConnected ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Live</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Offline</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={refreshMetrics}
                    disabled={loading}
                    className="group/btn border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-200"></div>
                    <RefreshCw className={`h-4 w-4 mr-2 relative ${loading ? 'animate-spin' : ''}`} />
                    <span className="relative">Refresh</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* System Overview */}
            {systemMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                        <p className="text-2xl font-bold text-gray-900">{systemMetrics.cpu.usage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">{systemMetrics.cpu.count} cores</p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                          <Cpu className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                        <p className="text-2xl font-bold text-gray-900">{systemMetrics.memory.usage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">
                          {(systemMetrics.memory.used / (1024 * 1024 * 1024)).toFixed(1)} GB
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                          <MemoryStick className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                        <p className="text-2xl font-bold text-gray-900">{systemMetrics.disk.usage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">
                          {(systemMetrics.disk.used / (1024 * 1024 * 1024)).toFixed(1)} GB
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                          <HardDrive className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Uptime</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {systemMetrics.uptime.split('h')[0]}h
                        </p>
                        <p className="text-xs text-gray-500">System running</p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                          <Server className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Real-time Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <CPUMetricChart data={cpuChartData} />
              <MemoryMetricChart data={memoryChartData} />
              <DiskMetricChart 
                data={diskChartData} 
                devices={systemMetrics?.disk.devices || []}
                className="xl:col-span-2"
              />
              <NetworkMetricChart 
                data={networkChartData}
                className="xl:col-span-2"
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </ProtectedRoute>
  );
}
