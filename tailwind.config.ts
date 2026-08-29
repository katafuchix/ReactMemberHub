import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './App.tsx',
    './main.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
