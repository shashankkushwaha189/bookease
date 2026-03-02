/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-soft": "var(--color-primary-soft)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        neutral: {
          900: "var(--color-neutral-900)",
          600: "var(--color-neutral-600)",
          200: "var(--color-neutral-200)",
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        brand: "var(--color-brand)",
        "brand-soft": "var(--color-brand-soft)",
      }
    },
  },
  plugins: [],
}
