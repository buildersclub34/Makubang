import React from 'react';
import { theme } from '../../src/theme';

export default function DiscoverScreen() {
  return (
    <div style={{ padding: theme.spacing.md }}>
      <h1 style={{
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing.lg
      }}>
        Discover Restaurants
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: theme.spacing.md
      }}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            border: `1px solid ${theme.colors.border}`,
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{
              width: '100%',
              height: '200px',
              backgroundColor: theme.colors.border,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textSecondary
            }}>
              Restaurant Image
            </div>
            <h3 style={{
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing.xs
            }}>
              Restaurant {item}
            </h3>
            <p style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              marginBottom: theme.spacing.sm
            }}>
              Delicious food • 4.5 ⭐ • 25-30 min
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                color: theme.colors.primary,
                fontWeight: theme.typography.fontWeight.bold
              }}>
                ₹200 for two
              </span>
              <button style={{
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                cursor: 'pointer'
              }}>
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}