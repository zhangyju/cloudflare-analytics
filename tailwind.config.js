/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cf: {
          orange: '#F37220',
          blue: '#0051BA',
          gray: '#F0F0F0',
        },
      },
    },
  },
  plugins: [],
};
