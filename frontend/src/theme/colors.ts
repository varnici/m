/**
 * VentureRoot Design Tokens
 * All colors, spacing, and radius values for the app.
 * Referenced by NativeWind/Tailwind and direct usage in components.
 */

export const colors = {
  ventureroot: {
    green: '#004D2C',
    gold: '#FFCC00',
    surface: '#F8F9FA',
    white: '#FFFFFF',
    dark: '#1A1A1A',
    // Industrial Monolith Tokens
    industrial: {
      primary: '#88d982',
      // Dynamic Variants
      light: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceLow: '#F9FAFB',
        surfaceHigh: '#F3F4F6',
        surfaceHighest: '#E5E7EB',
        onSurface: '#111827',
        outline: '#D1D5DB',
      },
      dark: {
        background: '#131313',
        surface: '#131313',
        surfaceLow: '#1C1B1B',
        surfaceHigh: '#2A2A2A',
        surfaceHighest: '#353534',
        onSurface: '#E5E2E1',
        outline: '#454652',
      },
      // Keep legacy for compatibility
      background: '#131313',
      onSurface: '#E5E2E1',
    },
    // Rich Vibe Tokens (Glassmorphism & Gradients)
    rich: {
      primary: '#6366F1', // Indigo
      secondary: '#EC4899', // Pink
      accent: '#8B5CF6', // Violet
      background: '#0F172A', // Slate 900
      glass: 'rgba(255, 255, 255, 0.1)',
      glassBorder: 'rgba(255, 255, 255, 0.2)',
      onSurface: '#F8FAFC',
    }
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  background: {
    page: '#F8F9FA',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    coral: '#FEE2E2',
    mintGreen: '#D1FAE5',
    lightGold: '#FEF3C7',
  },
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
} as const;