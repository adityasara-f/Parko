/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parko: {
          ivory: '#FAF7F4',
          charcoal: '#29282B',
          pink: '#F5C9DB',
          coral: '#F45B68',
          sand: '#F2ECE4',
          border: '#E8E1DA',
          muted: '#716E75'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(41, 40, 43, 0.05)',
        'lift': '0 10px 30px -5px rgba(41, 40, 43, 0.08)',
        'coral-glow': '0 4px 14px 0 rgba(244, 91, 104, 0.35)',
      }
    },
  },
  plugins: [],
}
