import { colors } from './colors';

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadows: {
    neon: {
      green: '0 0 20px rgba(0, 255, 136, 0.5)',
      pink: '0 0 20px rgba(255, 0, 128, 0.5)',
      blue: '0 0 20px rgba(0, 128, 255, 0.5)',
    },
  },
};

export * from './colors';
export default theme;