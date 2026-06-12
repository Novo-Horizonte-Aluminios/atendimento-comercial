/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        background: '#0a0a0c',
        card: '#16161b',
        border: '#2a2a32',
      },
      backgroundImage: {
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.2)',
      }
    },
  },
  plugins: [],
}
