/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ventureroot: {
          green: '#004D2C', // Master Brand Green
          gold: '#FFCC00',  // Nigerian Gold
          surface: '#F8F9FA',
          white: '#FFFFFF',
          dark: '#1A1A1A',
        }
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      fontFamily: {
        // We'll use system fonts for now, optimized for Android
        sans: ['System', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}