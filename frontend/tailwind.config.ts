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
        'dancing': ['"Dancing Script"', 'cursive'],
        'great-vibes': ['"Great Vibes"', 'cursive'],
        'allura': ['"Allura"', 'cursive'],
      },
    },
  },
  plugins: [],
};

export default config;
