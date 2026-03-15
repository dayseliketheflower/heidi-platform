/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
