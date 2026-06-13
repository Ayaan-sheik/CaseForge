import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F5',
        surface: '#FFFFFF',
        subtle: '#F6F3EC',
        ink: {
          DEFAULT: '#191510',
          secondary: '#5C564B',
          muted: '#8B8377',
        },
        line: '#E8E4DA',
        accent: {
          DEFAULT: '#EF3B2D',
          soft: '#FCE9E6',
        },
        success: '#4CC38A',
        device: {
          DEFAULT: '#15110C',
          line: '#2C261E',
          text: '#F4F1E9',
          dim: '#9C948A',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', ...defaultTheme.fontFamily.sans],
        display: ['var(--font-display)', ...defaultTheme.fontFamily.sans],
        editorial: ['var(--font-editorial)', ...defaultTheme.fontFamily.serif],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      maxWidth: {
        page: '1140px',
      },
    },
  },
  plugins: [],
};

export default config;
