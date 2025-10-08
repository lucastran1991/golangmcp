'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  FolderOpen, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and user management'
  },
  {
    name: 'Deployment',
    href: '/deployment',
    icon: BarChart3,
    description: 'System metrics and monitoring'
  },
  {
    name: 'File Manager',
    href: '/files',
    icon: FolderOpen,
    description: 'File upload and management'
  }
];

export function Sidebar({ 
  isOpen, 
  onToggle, 
  isCollapsed, 
  onToggleCollapse, 
  className 
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white/90 backdrop-blur-md border-r border-white/20 shadow-xl transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-sm opacity-30"></div>
                <div className="relative w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Golang MCP
                </h2>
                <p className="text-xs text-gray-600">User Management</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {/* Collapse toggle - desktop only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-8 w-8 hover:bg-white/20"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
            
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden h-8 w-8 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User info */}
        {!isCollapsed && user && (
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                <div className="relative w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden",
                  "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-md hover:-translate-y-0.5",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 shadow-md border border-blue-200/50"
                    : "text-gray-700 hover:text-gray-900"
                )}
                onClick={() => {
                  // Close mobile sidebar when navigating
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"></div>
                )}
                
                {/* Icon */}
                <div className={cn(
                  "relative flex-shrink-0",
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 group-hover:text-blue-600"
                )}>
                  <div className={cn(
                    "absolute inset-0 rounded-lg transition-opacity duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-100" 
                      : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100"
                  )}></div>
                  <Icon className="relative h-5 w-5" />
                </div>
                
                {/* Text content */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                )}
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-white/20">
            <div className="text-xs text-gray-500 text-center">
              <p>Golang MCP v1.0.0</p>
              <p className="mt-1">Full-stack User Management</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
