/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5e17eb',
          dark: '#4c11ce',
          light: '#f5f0ff',
          hover: '#4c11ce',
        },
        secondary: {
          DEFAULT: '#64748B',
        },
        accent: {
          DEFAULT: '#f97316',
          hover: '#ea580c',
        },
        background: {
          DEFAULT: '#F8FAFC',
        },
        card: {
          DEFAULT: '#FFFFFF',
        },
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        border: {
          DEFAULT: '#E2E8F0',
        },
        status: {
          success: '#16A34A',
          danger: '#DC2626',
          warning: '#F59E0B',
          info: '#0EA5E9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
