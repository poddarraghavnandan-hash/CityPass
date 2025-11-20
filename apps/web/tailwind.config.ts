import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class' as const,
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        none: '0',
        xs: '0.25rem',    /* 4px - small chips */
        sm: '0.5rem',     /* 8px - inputs, small buttons */
        DEFAULT: '0.75rem', /* 12px - cards, medium elements */
        md: '1rem',       /* 16px - large cards */
        lg: '1.25rem',    /* 20px - featured cards */
        xl: '1.5rem',     /* 24px - modals, drawers */
        '2xl': '2rem',    /* 32px - hero cards (maximum) */
        '3xl': '2.5rem',  /* 40px - preserve for compatibility */
        full: '9999px',   /* Pills, circular buttons */
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
