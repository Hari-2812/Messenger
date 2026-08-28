/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#EFF6FF',
          hover: '#1D4ED8', // matching dark for hover states
        },
        secondary: {
          DEFAULT: '#64748B',
        },
        accent: {
          DEFAULT: '#2563EB', // using primary as accent for consistency
          hover: '#1D4ED8',
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
