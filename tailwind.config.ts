import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy POS colors (backward compat)
        'pos-dark': '#2B3544',
        'pos-darker': '#1F2937',
        'pos-blue': '#3B82F6',
        'pos-green': '#10B981',
        'pos-red': '#EF4444',
        'pos-orange': '#F59E0B',
        'pos-gray': '#6B7280',
        'pos-light-gray': '#9CA3AF',
        'custom-gray': '#D7D7D7',

        // Dashboard Design System
        dash: {
          deepest: 'var(--dash-bg-deepest)',
          base: 'var(--dash-bg-base)',
          surface: 'var(--dash-bg-surface)',
          raised: 'var(--dash-bg-raised)',
          overlay: 'var(--dash-bg-overlay)',
          highlight: 'var(--dash-bg-highlight)',
        },
        'dash-text': {
          primary: 'var(--dash-text-primary)',
          secondary: 'var(--dash-text-secondary)',
          muted: 'var(--dash-text-muted)',
          disabled: 'var(--dash-text-disabled)',
        },
        'dash-border': {
          subtle: 'var(--dash-border-subtle)',
          DEFAULT: 'var(--dash-border-default)',
          strong: 'var(--dash-border-strong)',
          focus: 'var(--dash-border-focus)',
        },
        'dash-accent': {
          blue: 'var(--dash-accent-blue)',
          green: 'var(--dash-accent-green)',
          red: 'var(--dash-accent-red)',
          orange: 'var(--dash-accent-orange)',
          purple: 'var(--dash-accent-purple)',
          cyan: 'var(--dash-accent-cyan)',
          'blue-subtle': 'var(--dash-accent-blue-subtle)',
          'green-subtle': 'var(--dash-accent-green-subtle)',
          'red-subtle': 'var(--dash-accent-red-subtle)',
          'orange-subtle': 'var(--dash-accent-orange-subtle)',
          'purple-subtle': 'var(--dash-accent-purple-subtle)',
          'cyan-subtle': 'var(--dash-accent-cyan-subtle)',
        },
      },
      fontFamily: {
        'arabic': ['Cairo', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'dash-sm': 'var(--dash-shadow-sm)',
        'dash-md': 'var(--dash-shadow-md)',
        'dash-lg': 'var(--dash-shadow-lg)',
        'dash-glow-blue': 'var(--dash-shadow-glow-blue)',
      },
      borderRadius: {
        'dash-sm': 'var(--dash-radius-sm)',
        'dash-md': 'var(--dash-radius-md)',
        'dash-lg': 'var(--dash-radius-lg)',
        'dash-xl': 'var(--dash-radius-xl)',
      },
      transitionDuration: {
        'dash-fast': 'var(--dash-transition-fast)',
        'dash-normal': 'var(--dash-transition-normal)',
        'dash-slow': 'var(--dash-transition-slow)',
      },
      keyframes: {
        dashFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        dashSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dashSlideRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        dashScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        dashPulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'dash-fade-in': 'dashFadeIn 200ms ease-out',
        'dash-slide-up': 'dashSlideUp 200ms ease-out',
        'dash-slide-right': 'dashSlideRight 200ms ease-out',
        'dash-scale-in': 'dashScaleIn 200ms ease-out',
        'dash-pulse-subtle': 'dashPulseSubtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
