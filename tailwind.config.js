/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gatorBlue: '#0033A0',
        gatorOrange: '#FA4616',
        gatorDark: '#111827',
        gatorLight: '#F9FAFB',
      },
    },
  },
  plugins: [],
};

