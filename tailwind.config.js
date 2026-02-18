/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f2f4f2',
          100: '#dde2dd',
          200: '#c0c9c1',
          300: '#9daa9e',
          400: '#677667',
          500: '#49604b',
          600: '#3b4e3d',
          700: '#2e3d30',
          800: '#232e24',
          900: '#1a231b',
        },
        sand: {
          50: '#f5f5f1',
          100: '#eceae3',
          200: '#dddbd2',
          300: '#cccac0',
          400: '#b9b8ae',
          500: '#a5a397',
        },
        charcoal: {
          900: '#161e17',
          800: '#1f271f',
          700: '#2a332b',
        },
      },
      fontFamily: {
        display: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
