/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0a0a0f',
          secondary: '#111118',
          tertiary: '#18181f',
          elevated: '#1e1e28',
        },
        border: {
          DEFAULT: '#2a2a38',
          muted: '#1e1e2a',
          strong: '#3a3a50',
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#9090a8',
          muted: '#5a5a72',
        },
        accent: {
          DEFAULT: '#7c6af7',
          hover: '#9182f8',
          muted: '#7c6af720',
        },
        income: {
          DEFAULT: '#22c55e',
          muted: '#22c55e18',
        },
        expense: {
          DEFAULT: '#f43f5e',
          muted: '#f43f5e18',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: '#f59e0b18',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
