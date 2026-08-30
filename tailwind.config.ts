import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: "#fdf8f0",
          100: "#f7eddd",
          200: "#eed7b8",
          300: "#e0bc8d",
          400: "#d1a062",
          500: "#c48a44",
          600: "#b5862e",
          700: "#96692a",
          800: "#7a5427",
          900: "#5e4222",
          950: "#3b2a20",
        },
        cream: "#f7f0e6",
      },
      fontFamily: {
        sans: ["var(--font-padauk)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;