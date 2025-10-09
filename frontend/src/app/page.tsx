'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles, Zap, Shield, Rocket } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [animationStep, setAnimationStep] = useState(0);
  const [particles, setParticles] = useState<Array<{left: string, top: string, animationDelay: string, animationDuration: string}>>([]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Generate particles only on client side to avoid hydration mismatch
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 2}s`
      }));
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  const features = [
    { icon: Zap, text: "Lightning Fast", color: "from-yellow-400 to-orange-500" },
    { icon: Shield, text: "Secure", color: "from-green-400 to-emerald-500" },
    { icon: Rocket, text: "Modern", color: "from-purple-400 to-pink-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full animate-bounce"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
          {/* Animated logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-12">
                <Sparkles className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Animated title */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
            Welcome to Demo Hub
          </h1>
          
          {/* Feature highlights */}
          <div className="flex justify-center space-x-6 mb-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r ${feature.color} text-white text-sm font-medium shadow-lg transform transition-all duration-300 hover:scale-110 ${
                    animationStep === index ? 'animate-pulse' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{feature.text}</span>
                </div>
              );
            })}
          </div>
          
          {/* Enhanced loading state */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="relative">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <div className="absolute inset-0 h-6 w-6 border-2 border-blue-200 rounded-full animate-ping"></div>
            </div>
            <p className="text-gray-700 font-medium text-lg">Redirecting you to the right place...</p>
          </div>
          
          {/* Advanced loading dots */}
          <div className="flex items-center justify-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
          
          {/* Progress bar */}
          <div className="mt-6 w-64 mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}