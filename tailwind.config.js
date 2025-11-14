/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lucius-lime': '#91A673',
        'bright-white': '#F6F2F1',
        'dark-hunter-green': '#3A4A3F',
        'whisper-white': '#EAE2D3',
        'bokara-grey': '#2A2725',
        'wet-sand': '#AE8F60',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}