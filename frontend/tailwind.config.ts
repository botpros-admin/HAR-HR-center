import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '500px',
        'md': '1024px',  // Override md to be 1024px (same as lg)
        'lg': '1280px',  // Override lg to be 1280px (same as xl)
      },
      colors: {
        hartzell: {
          blue: '#0066CC',
          navy: '#003366',
          gray: '#F5F5F5',
          darkGray: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
