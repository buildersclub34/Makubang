import React from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { theme } from '../src/theme';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      backgroundColor: theme.colors.background 
    }}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </div>
  );
}