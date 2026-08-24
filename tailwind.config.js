/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#0a0713',
          900: '#120c22',
          800: '#1b1233',
          700: '#271a4a',
          600: '#372563',
        },
        blood: {
          500: '#c1121f',
          400: '#e02434',
          300: '#f26d78',
        },
        moon: {
          200: '#f4e9c8',
          100: '#fbf6e6',
        },
      },
      fontFamily: {
        display: ['"Trebuchet MS"', 'Verdana', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSlow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms ease-out both',
        'pulse-slow': 'pulseSlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
