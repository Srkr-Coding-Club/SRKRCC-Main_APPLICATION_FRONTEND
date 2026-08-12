import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          orange: "#FF7A00",
          "orange-hover": "#E06B00",
          burgundy: "#8B2E3B",
          "burgundy-hover": "#742530",
          navy: "#1A1A2E",
          gold: "#FFA500",
          purple: "#6B3B84",
          "light-orange": "#FFE5CC",
          "dark-gray": "#2D2D3D",
          "medium-gray": "#6F6F7F",
          "light-gray": "#F5F5F5",
          "card-bg": "var(--card-bg)",
          border: "var(--border-color)",
        },
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "Poppins", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        std: "8px",
        card: "8px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        subtle: "0 2px 8px rgba(0, 0, 0, 0.08)",
        dramatic: "0 8px 24px rgba(0, 0, 0, 0.12)",
        "brand-glow": "0 0 25px rgba(255, 122, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
