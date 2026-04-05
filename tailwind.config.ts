import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#03045e',
          800: '#023e8a',
          700: '#0077b6',
          600: '#0096c7',
          500: '#00b4d8',
          400: '#48cae4',
        },
      },
      keyframes: {
        heroGrad: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px #00b4d8, 0 0 10px #00b4d8' },
          '50%': { boxShadow: '0 0 15px #48cae4, 0 0 30px #48cae4' },
        },
      },
      animation: {
        'hero-grad': 'heroGrad 8s ease infinite',
        glow: 'glowPulse 2s ease-in-out infinite',
      },
      backgroundSize: {
        '300': '300% 300%',
      },
    },
  },
  plugins: [],
};

export default config;
