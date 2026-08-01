/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#241252',
          hover: '#31206B',
        },
        secondary: {
          DEFAULT: '#31206B',
        },
        accent: {
          DEFAULT: '#F57C20',
          hover: '#FF8F3D',
        },
        background: {
          DEFAULT: '#F8FAFC',
        },
        card: {
          DEFAULT: '#FFFFFF',
        },
        text: {
          DEFAULT: '#111827',
          muted: '#6B7280',
        },
        border: {
          DEFAULT: '#E5E7EB',
        },
        status: {
          success: '#16A34A',
          danger: '#DC2626',
          warning: '#D97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
