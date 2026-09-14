/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe3fe",
          300: "#93d2fd",
          400: "#5fb7fa",
          500: "#3a99f2",
          600: "#247ce6",
          700: "#1d64c9",
          800: "#1e53a3",
          900: "#1e4680",
          950: "#152c50",
        },
        risk: {
          low: "#22c55e",
          moderate: "#eab308",
          high: "#f97316",
          severe: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px -8px rgba(15,23,42,0.12)",
      },
    },
  },
  plugins: [],
};
