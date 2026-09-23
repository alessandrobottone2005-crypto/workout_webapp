/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: '#09090A',
          surface: '#141416',
          elevated: '#1C1C1E',
        },
        text: {
          primary: '#F5F5F7',
          secondary: '#8E8E93',
        },
        border: {
          default: '#2C2C2E',
        },
        accent: {
          primary: '#C8FF3D',
        },
        danger: '#FF453A',
        warning: '#FFD60A',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'sans-serif',
        ],
      },
      fontSize: {
        'display': ['40px', { fontWeight: '700', lineHeight: '1.1' }],
        'title': ['28px', { fontWeight: '700', lineHeight: '1.2' }],
        'heading': ['20px', { fontWeight: '600', lineHeight: '1.3' }],
        'body': ['16px', { fontWeight: '400', lineHeight: '1.5' }],
        'meta': ['14px', { fontWeight: '500', lineHeight: '1.4' }],
        'label-sm': ['12px', { fontWeight: '600', lineHeight: '1.3' }],
        'numeric-lg': ['64px', { fontWeight: '700', lineHeight: '1' }],
      },
      borderRadius: {
        'sm': '10px',
        'btn': '14px',
        'card': '20px',
        'modal': '28px',
        'pill': '999px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen': '100dvh',
        'touch': '44px',
      },
      height: {
        'cta': '56px',
        'touch': '44px',
      },
      animation: {
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-accent': 'pulseAccent 2s ease-in-out infinite',
      },
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseAccent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
