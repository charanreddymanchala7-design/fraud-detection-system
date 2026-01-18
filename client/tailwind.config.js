/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22c55e',
          medium: '#f59e0b',
          high: '#ef4444',
        },
        status: {
          pending: '#6b7280',
          approved: '#22c55e',
          blocked: '#ef4444',
          review: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
