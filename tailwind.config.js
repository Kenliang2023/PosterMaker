/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/client/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'led-primary': '#1D4ED8', // 定义应用主色调
        'led-secondary': '#10B981', // 定义应用次要色调
        'led-dark': '#111827',
        'led-light': '#F9FAFB',
      },
    },
  },
  plugins: [],
}; 