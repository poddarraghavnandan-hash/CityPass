export const cityLensTheme = {
  colors: {
    background: '#05030b',
    backgroundSoft: '#0b0816',
    surface: '#101328',
    surfaceAlt: '#151936',
    neon: '#4d7bff',
    neonPink: '#f45bff',
    neonAqua: '#22ffd3',
    textPrimary: '#f5f6ff',
    textSecondary: '#98a1c0',
    border: 'rgba(255,255,255,0.08)',
    borderBright: 'rgba(77,123,255,0.4)',
    glow: 'rgba(68,127,255,0.45)',
    success: '#37f586',
    warning: '#ffb347',
    danger: '#ff5f6d',
  },
  typography: {
    hero: 'clamp(2.75rem, 6vw, 4.5rem)',
    title: 'clamp(1.75rem, 3.5vw, 3rem)',
    section: '1.5rem',
    body: '1rem',
    label: '0.85rem',
  },
  radii: {
    pill: '9999px',
    large: '32px',
    medium: '24px',
    small: '16px',
  },
  shadows: {
    glow: '0 15px 60px rgba(77, 123, 255, 0.25)',
    inset: 'inset 0 0 60px rgba(77, 123, 255, 0.05)',
  },
  gradients: {
    hero: 'linear-gradient(120deg, rgba(77, 123, 255, 0.65), rgba(244, 91, 255, 0.4))',
    card: 'linear-gradient(160deg, rgba(77, 123, 255, 0.15), rgba(22, 21, 43, 0.95))',
    badge: 'linear-gradient(90deg, rgba(77, 123, 255, 0.75), rgba(34, 255, 211, 0.75))',
  },
} as const;

export type CityLensTheme = typeof cityLensTheme;
