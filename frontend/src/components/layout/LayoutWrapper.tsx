'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useNavigation } from '@/contexts/NavigationContext';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isOpen, isCollapsed, toggleSidebar } = useNavigation();
  const pathname = usePathname();

  // Don't show sidebar on login/register pages
  const hideSidebar = pathname === '/login' || pathname === '/register';

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isOpen}
        onToggle={toggleSidebar}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => {}}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-white/20"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              Demo
            </h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
