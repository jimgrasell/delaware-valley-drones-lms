/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f4c81',
          light: '#1d6fb8',
          dark: '#0a3258',
        },
      },
    },
  },
  plugins: [],
};
