import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#2F2F2F',
          'dark-deep': '#1E1E1E',
          'dark-card': '#383838',
          'dark-hover': '#444444',
          'dark-border': '#4A4A4A',
          gold: '#FFC107',
          'gold-dark': '#F5A623',
          text: '#E0E0E0',
          'text-muted': '#9E9E9E',
        },
        status: {
          success: '#4CAF50',
          error: '#F44336',
          warning: '#FFC107',
          info: '#2196F3',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
