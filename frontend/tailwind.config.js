/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        midnight: '#0a0b0f',
        surface: '#111318',
        'surface-2': '#191c24',
        border: '#1e2230',
        muted: '#3a3f52',
        subtle: '#8b93a8',
        primary: '#7c6af7',
        'primary-dim': '#3d3580',
        accent: '#e85d8a',
        'accent-dim': '#7a1f42',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
        calm: '#60c7e8',
        anger: '#f87171',
        fear: '#a78bfa',
        sadness: '#60a5fa',
        joy: '#fbbf24',
        anxiety: '#fb923c',
        shame: '#e879f9',
        grief: '#94a3b8',
        frustration: '#f97316',
        overwhelm: '#c084fc',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(ellipse at 0% 0%, #3d1f6e 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, #1a0f3d 0%, transparent 50%)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(124, 106, 247, 0.15)',
        'glow-accent': '0 0 30px rgba(232, 93, 138, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
