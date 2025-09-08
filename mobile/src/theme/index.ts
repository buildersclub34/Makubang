
import colors from './colors';

export const theme = {
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    neon: {
      green: '#00FF88',
      blue: '#00A3FF',
      pink: '#FF3EA5',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 28,
      xxxl: 32,
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 999
  }
};

export default theme;
