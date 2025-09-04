
import React from 'react';
import { theme } from '../../src/theme';

interface TabLayoutProps {
  children: React.ReactNode;
}

export default function TabLayout({ children }: TabLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main style={{ flex: 1, padding: theme.spacing.md }}>
        {children}
      </main>
      
      <nav style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderTop: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        bottom: 0
      }}>
        <a href="/discover" style={{
          textDecoration: 'none',
          color: theme.colors.text,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md
        }}>
          Discover
        </a>
        <a href="/feed" style={{
          textDecoration: 'none',
          color: theme.colors.text,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md
        }}>
          Feed
        </a>
        <a href="/orders" style={{
          textDecoration: 'none',
          color: theme.colors.text,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md
        }}>
          Orders
        </a>
        <a href="/profile" style={{
          textDecoration: 'none',
          color: theme.colors.text,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md
        }}>
          Profile
        </a>
      </nav>
    </div>
  );
}
