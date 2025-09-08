import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import TopNavigation from '@/components/top-navigation';
import BottomNavigation from '@/components/bottom-navigation';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <TopNavigation />
      
      {/* Main Content */}
      <main className="pb-20 pt-16">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
