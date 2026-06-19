import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--ims-radius-sm)',
        DEFAULT: 'var(--ims-radius)',
        lg: 'var(--ims-radius-lg)',
        xl: 'var(--ims-radius-xl)',
        '2xl': 'var(--ims-radius-2xl)',
      },
    },
  },
  plugins: [],
};

export default config;
