/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f3',
          100: '#ffe4e8',
          200: '#fecdd6',
          300: '#fda4b8',
          400: '#fb7193',
          500: '#e11d48',
          600: '#9e102f', // Wings on Wheels Signature Crimson Red
          700: '#840c26',
          800: '#6c0a1f',
          900: '#4d0515',
          950: '#2b020b',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0', // Piston metallic silver
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a', // Speed tire tread black
          950: '#080c14',
        },
        dark: {
          base: '#0b0f19',     // Main background in dark mode
          card: '#111827',     // Card surface
          elevated: '#1e293b', // Elevated dropdowns / inputs
          border: '#1f2937',   // Borders
          muted: '#94a3b8',    // Muted text
        },
        brand: {
          crimson: '#9e102f',
          ruby: '#b91c3c',
          bright: '#e11d48',
          piston: '#e2e8f0',
          dark: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
