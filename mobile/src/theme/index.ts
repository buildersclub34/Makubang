import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B6B',
    accent: '#4ECDC4',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    error: '#FF5252',
    text: '#2D3436',
    disabled: '#B2BEC3',
    placeholder: '#636E72',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF6B6B',
    success: '#00B894',
    warning: '#FDCB6E',
    info: '#0984E3',
    card: '#FFFFFF',
    border: '#DFE6E9',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body1: {
      fontSize: 16,
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '500',
      textTransform: 'uppercase',
    },
  },
};

export default theme;
