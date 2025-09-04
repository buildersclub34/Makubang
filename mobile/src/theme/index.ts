
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
    info: colors.info
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      bold: '700'
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12
  }
};

export default theme;
