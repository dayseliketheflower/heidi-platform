/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        'dm-sans': ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        heidi: {
          primary: '#5C2D5C',
          'primary-dark': '#3D1A3D',
          bg: '#FBF7F2',
          surface: '#ffffff',
          text: '#2A1F2A',
          'text-muted': '#6B5A6B',
          border: '#E8DDD0',
          success: '#10b981',
        },
        primary: {
          50: '#fdf4f3',
          100: '#fce9e6',
          200: '#f9d6d1',
          300: '#f4b8ae',
          400: '#ec8e7d',
          500: '#e06651',
          600: '#cc4a37',
          700: '#ab3a2a',
          800: '#8d3325',
          900: '#752f25',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d1dbe6',
          300: '#a8bdd0',
          400: '#789bb6',
          500: '#567fa0',
          600: '#436585',
          700: '#37516c',
          800: '#30455a',
          900: '#2c3c4c',
        },
      },
    },
  },
  plugins: [],
}
