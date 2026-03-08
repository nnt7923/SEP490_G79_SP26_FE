/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#fafafa',
          surface: '#ffffff',
          border: '#d4d4d4',
          text: '#1e1e1e',
          muted: '#6b7280',
          accent: '#0969da',
          green: '#1a7f37',
          red: '#cf222e',
          yellow: '#9a6700',
        },
      },
    },
  },
  plugins: [],
}