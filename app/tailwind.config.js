/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        body: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        logo: ['"Nunito"', 'sans-serif'],
      },
      colors: {
        arc: {
          bg:      '#FFFFFF',
          fg:      '#0C0C0C',
          border:  '#EBEBEB',
          muted:   '#F5F5F5',
          muted2:  '#EDEDED',
          'muted-fg': '#8C8C8C',
          accent:  '#F5A623',
        },
        cat: {
          tech:     '#6366F1',
          markets:  '#10B981',
          science:  '#0EA5E9',
          politics: '#EF4444',
          sports:   '#F59E0B',
          health:   '#EC4899',
          business: '#8B5CF6',
        },
      },
      borderRadius: {
        'sm':   '8px',
        'md':   '12px',
        'lg':   '16px',
        'xl':   '24px',
        'full': '9999px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(0,0,0,0.06)',
        md: '0 4px 16px rgba(0,0,0,0.08)',
        shell: '0 0 0 0.5px rgba(0,0,0,0.08), 0 32px 80px rgba(0,0,0,0.18)',
        'send-btn': '0 2px 10px rgba(99,102,241,0.35)',
        'pill-active': '0 2px 10px rgba(99,102,241,0.28)',
      },
      keyframes: {
        cardReveal: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        chipsFadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.5) rotate(-20deg)' },
          to:   { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          to:   { opacity: '0', transform: 'scale(0.5) rotate(20deg)' },
        },
      },
      animation: {
        'card-reveal':   'cardReveal 0.5s cubic-bezier(0.4,0,0.2,1) forwards',
        'chips-fade-in': 'chipsFadeIn 0.25s cubic-bezier(0.4,0,0.2,1) forwards',
        'scale-in':      'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'scale-out':     'scaleOut 0.18s cubic-bezier(0.4,0,0.2,1) forwards',
      },
    },
  },
  plugins: [],
}
