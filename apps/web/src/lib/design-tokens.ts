/**
 * CityPass Design System Tokens
 * Centralized design values for consistent UI across the platform
 */

export const designTokens = {
  /**
   * Color Palette
   * Brand colors, semantic colors, and neutral scales
   */
  colors: {
    // Brand Colors
    brand: {
      purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea', // Primary brand purple
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },
      blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6', // Primary brand blue
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
        vibrant: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
        subtle: 'linear-gradient(135deg, rgba(147,51,234,0.1) 0%, rgba(59,130,246,0.1) 100%)',
      },
    },

    // Semantic Colors
    semantic: {
      success: {
        light: '#d1fae5',
        DEFAULT: '#10b981',
        dark: '#047857',
      },
      warning: {
        light: '#fef3c7',
        DEFAULT: '#f59e0b',
        dark: '#d97706',
      },
      error: {
        light: '#fee2e2',
        DEFAULT: '#ef4444',
        dark: '#dc2626',
      },
      info: {
        light: '#dbeafe',
        DEFAULT: '#3b82f6',
        dark: '#1d4ed8',
      },
    },

    // Mood Colors (for CityLens moods)
    mood: {
      calm: {
        primary: '#10b981', // green
        light: '#d1fae5',
        dark: '#047857',
      },
      social: {
        primary: '#f59e0b', // amber
        light: '#fef3c7',
        dark: '#d97706',
      },
      electric: {
        primary: '#ec4899', // pink
        light: '#fce7f3',
        dark: '#db2777',
      },
      artistic: {
        primary: '#8b5cf6', // violet
        light: '#ede9fe',
        dark: '#7c3aed',
      },
      grounded: {
        primary: '#78716c', // stone
        light: '#e7e5e4',
        dark: '#57534e',
      },
    },

    // Neutral Scale (for light/dark mode)
    neutral: {
      light: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },
      dark: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#262626',
        300: '#404040',
        400: '#525252',
        500: '#737373',
        600: '#a3a3a3',
        700: '#d4d4d4',
        800: '#e5e5e5',
        900: '#f5f5f5',
      },
    },

    // Glassmorphism backgrounds
    glass: {
      light: {
        primary: 'rgba(255, 255, 255, 0.6)',
        secondary: 'rgba(255, 255, 255, 0.8)',
        subtle: 'rgba(255, 255, 255, 0.4)',
      },
      dark: {
        primary: 'rgba(255, 255, 255, 0.1)',
        secondary: 'rgba(255, 255, 255, 0.05)',
        subtle: 'rgba(0, 0, 0, 0.4)',
      },
    },
  },

  /**
   * Typography
   * Font families, sizes, weights, and line heights
   */
  typography: {
    // Font Families
    fonts: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
    },

    // Font Sizes (with corresponding line heights)
    sizes: {
      xs: {
        fontSize: '0.75rem', // 12px
        lineHeight: '1rem', // 16px
      },
      sm: {
        fontSize: '0.875rem', // 14px
        lineHeight: '1.25rem', // 20px
      },
      base: {
        fontSize: '1rem', // 16px
        lineHeight: '1.5rem', // 24px
      },
      lg: {
        fontSize: '1.125rem', // 18px
        lineHeight: '1.75rem', // 28px
      },
      xl: {
        fontSize: '1.25rem', // 20px
        lineHeight: '1.75rem', // 28px
      },
      '2xl': {
        fontSize: '1.5rem', // 24px
        lineHeight: '2rem', // 32px
      },
      '3xl': {
        fontSize: '1.875rem', // 30px
        lineHeight: '2.25rem', // 36px
      },
      '4xl': {
        fontSize: '2.25rem', // 36px
        lineHeight: '2.5rem', // 40px
      },
      '5xl': {
        fontSize: '3rem', // 48px
        lineHeight: '1',
      },
      '6xl': {
        fontSize: '3.75rem', // 60px
        lineHeight: '1',
      },
      '7xl': {
        fontSize: '4.5rem', // 72px
        lineHeight: '1',
      },
    },

    // Font Weights
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    // Letter Spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  /**
   * Spacing Scale
   * Consistent spacing values for margins, padding, gaps, etc.
   */
  spacing: {
    0: '0px',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    32: '8rem', // 128px
    40: '10rem', // 160px
    48: '12rem', // 192px
    56: '14rem', // 224px
    64: '16rem', // 256px
  },

  /**
   * Border Radius
   * Consistent border radius values
   */
  borderRadius: {
    none: '0px',
    sm: '0.125rem', // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  /**
   * Shadows
   * Box shadows for elevation and depth
   */
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    glow: {
      purple: '0 0 20px rgba(147, 51, 234, 0.3)',
      blue: '0 0 20px rgba(59, 130, 246, 0.3)',
      pink: '0 0 20px rgba(236, 72, 153, 0.3)',
    },
  },

  /**
   * Animation Durations
   * Consistent timing for transitions and animations
   */
  animation: {
    duration: {
      fastest: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '400ms',
      slowest: '600ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  /**
   * Breakpoints
   * Responsive design breakpoints
   */
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  /**
   * Z-Index Scale
   * Consistent stacking order
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
    tooltip: 70,
  },

  /**
   * Backdrop Blur
   * For glassmorphism effects
   */
  backdropBlur: {
    none: '0',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
  },
} as const;

/**
 * Helper function to get CSS variable-safe color values
 */
export function getCSSVariable(path: string): string {
  return `var(--${path.replace(/\./g, '-')})`;
}

/**
 * Helper to generate glassmorphism styles
 */
export function getGlassStyles(darkMode: boolean, opacity: 'subtle' | 'primary' | 'secondary' = 'primary') {
  const bg = darkMode ? designTokens.colors.glass.dark[opacity] : designTokens.colors.glass.light[opacity];
  const border = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  return {
    backgroundColor: bg,
    backdropFilter: `blur(${designTokens.backdropBlur.xl})`,
    borderColor: border,
  };
}

/**
 * Helper to get mood color
 */
export function getMoodColor(mood: 'calm' | 'social' | 'electric' | 'artistic' | 'grounded', shade: 'primary' | 'light' | 'dark' = 'primary') {
  return designTokens.colors.mood[mood][shade];
}

// Export type for design tokens
export type DesignTokens = typeof designTokens;
