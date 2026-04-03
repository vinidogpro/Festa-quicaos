import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#f5f7fb",
        ink: "#0f172a",
        muted: "#64748b",
        brand: {
          50: "#eef9f1",
          100: "#d8f0de",
          200: "#b4e1c0",
          300: "#84cc98",
          400: "#4daa68",
          500: "#2f8a4f",
          600: "#246c3e",
          700: "#1f5633",
          800: "#1c452b",
          900: "#183924"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top left, rgba(47, 138, 79, 0.18), transparent 35%), radial-gradient(circle at top right, rgba(15, 23, 42, 0.10), transparent 25%), linear-gradient(180deg, #f8fafc 0%, #eef4ef 100%)"
      }
    }
  },
  plugins: []
};

export default config;
