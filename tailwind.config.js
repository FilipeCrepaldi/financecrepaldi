/** @type {import('tailwindcss').Config} */
export default {
  // Ativa dark: prefix quando [data-theme="dark"] está presente no ancestral
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cores de superfície via CSS variables — trocam automaticamente com data-theme
        background: {
          DEFAULT:   'rgb(var(--bg-rgb)    / <alpha-value>)',
          secondary: 'rgb(var(--bg2-rgb)   / <alpha-value>)',
          tertiary:  'rgb(var(--card-rgb)  / <alpha-value>)',
          elevated:  'rgb(var(--card2-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-rgb)       / <alpha-value>)',
          muted:   'rgb(var(--border-soft-rgb)  / <alpha-value>)',
          strong:  'rgb(var(--border-strong-rgb)/ <alpha-value>)',
        },
        text: {
          primary:   'rgb(var(--fg1-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--fg2-rgb) / <alpha-value>)',
          muted:     'rgb(var(--fg3-rgb) / <alpha-value>)',
        },
        // Cores de marca — fixas nos dois modos
        accent: {
          DEFAULT: '#7B1E3A',
          hover:   '#A33150',
          muted:   'rgba(123, 30, 58, 0.13)',
        },
        income: {
          DEFAULT: '#22C55E',
          muted:   'rgba(34, 197, 94, 0.12)',
        },
        expense: {
          DEFAULT: '#DC4C64',
          muted:   'rgba(220, 76, 100, 0.12)',
        },
        warning: {
          DEFAULT: '#D4AF37',
          muted:   'rgba(212, 175, 55, 0.12)',
        },
        highlight: '#CDAA5E',
        rubi:      '#BE4B6B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm:         '0 1px 2px rgba(20, 10, 14, 0.18)',
        md:         '0 4px 16px rgba(20, 10, 14, 0.22)',
        lg:         '0 12px 40px rgba(20, 10, 14, 0.30)',
        'glow-gold':'0 0 0 1px rgba(205, 170, 94, 0.35), 0 6px 24px rgba(205, 170, 94, 0.18)',
        'glow-wine':'0 8px 30px rgba(123, 30, 58, 0.35)',
      },
      animation: {
        'fade-in':  'fadeIn  0.2s  cubic-bezier(0.16,1,0.3,1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        'slide-in': 'slideIn 0.2s  cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
