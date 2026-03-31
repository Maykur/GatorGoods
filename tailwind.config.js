const forms = require('@tailwindcss/forms');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        gatorBlue: 'rgb(var(--color-brand-blue) / <alpha-value>)',
        gatorShade: 'rgb(var(--color-brand-blue-deep) / <alpha-value>)',
        gatorOrange: 'rgb(var(--color-brand-orange) / <alpha-value>)',
        gatorDark: 'rgb(var(--color-bg) / <alpha-value>)',
        gatorLight: 'rgb(var(--color-text) / <alpha-value>)',
        brand: {
          blue: 'rgb(var(--color-brand-blue) / <alpha-value>)',
          blueDeep: 'rgb(var(--color-brand-blue-deep) / <alpha-value>)',
          orange: 'rgb(var(--color-brand-orange) / <alpha-value>)',
        },
        app: {
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          panel: 'rgb(var(--color-panel) / <alpha-value>)',
          elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          soft: 'rgb(var(--color-text-soft) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)',
          warning: 'rgb(var(--color-warning) / <alpha-value>)',
          danger: 'rgb(var(--color-danger) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: '0 20px 60px -32px rgba(15, 23, 42, 0.85)',
        focus: '0 0 0 4px rgba(250, 70, 22, 0.16)',
        glow: '0 22px 70px -34px rgba(0, 51, 160, 0.5)',
      },
      ringColor: {
        focus: 'rgb(var(--color-ring) / 0.55)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(12px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        pulseSoft: {
          '0%, 100%': {
            opacity: '0.6',
          },
          '50%': {
            opacity: '1',
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 320ms ease-out',
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
};
