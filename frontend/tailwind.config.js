/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      colors: {
        // PharmAssist Brand Primary Accent
        primary: {
          50: '#F1F0FE',
          100: '#E8E6FD',
          200: '#D1CDFA',
          300: '#A9A2F6',
          400: '#8177F1',
          500: '#6C5CE7',
          600: '#5B4FE9',
          700: '#473BC5',
          800: '#382FA1',
          900: '#2F2783',
          950: '#1B1652',
        },
        // Semantic Traffic-Light System
        status: {
          successBg: '#E9F9EE',
          successText: '#1C9A4B',
          successIcon: '#22C55E',
          warningBg: '#FEF6E7',
          warningText: '#B7791F',
          warningIcon: '#F5A524',
          criticalBg: '#FDEDEC',
          criticalText: '#C0392B',
          criticalIcon: '#E74C3C',
          infoBg: '#EBF3FF',
          infoText: '#2563EB',
          infoIcon: '#3B82F6',
        },
        severity: {
          critical: '#C0392B',
          major: '#B7791F',
          minor: '#2563EB',
        },
        // Dark mode palette
        dark: {
          bg: '#1a1b26',
          surface: '#24283b',
          border: '#292e42',
          text: '#a9b1d6',
          'text-bright': '#c0caf5',
          accent: '#7aa2f7',
          success: '#9ece6a',
          warning: '#e0af68',
          error: '#f7768e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'field-highlight': 'fieldHighlight 3s ease-out forwards',
        'pulse-dot': 'pulseDot 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fieldHighlight: {
          '0%': { backgroundColor: '#E9F9EE', borderColor: '#22C55E' },
          '50%': { backgroundColor: '#E9F9EE', borderColor: '#22C55E' },
          '100%': { backgroundColor: 'transparent', borderColor: 'transparent' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      boxShadow: {
        'card': 'none',
        'card-md': '0 1px 3px 0 rgba(15, 14, 23, 0.05)',
        'card-lg': '0 4px 6px -1px rgba(15, 14, 23, 0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
