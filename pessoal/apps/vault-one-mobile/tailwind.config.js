/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-app': '#0e1411',
        'bg-card': '#2f3734',
        'bg-card-2': '#202725',
        border: '#4e5653',
        divider: '#424a47',
        hover: '#3e4744',
        accent: '#3A8F6E',
        'accent-emph': '#2E7D6B',
        money: '#D4AF37',
        success: '#6CCB8C',
        warning: '#E0B257',
        error: '#F07167',
        'fg-primary': '#eaedeb',
        'fg-secondary': '#939f9a',
        'fg-muted': '#7d8884',
        link: '#8FCDBD',
      },
    },
  },
  plugins: [],
}
