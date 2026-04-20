import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F4F2",
        sidebar: "#EEECE9",
        card: "#FFFFFF",
        "text-primary": "#1A1A18",
        "text-secondary": "#6B6B68",
        border: "#E2E0DC",
        accent: "#2C5F2E",
        "accent-hover": "#1E4220",
        error: "#C0392B",
        skeleton: "#E8E6E2",
        "skeleton-shimmer": "#F0EDE9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        heading: ["var(--font-lora)", "Lora", "serif"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4" }],
        xs: ["12px", { lineHeight: "1.4" }],
        sm: ["14px", { lineHeight: "1.4" }],
        base: ["15px", { lineHeight: "1.65" }],
        lg: ["18px", { lineHeight: "1.35" }],
        xl: ["22px", { lineHeight: "1.35" }],
        "2xl": ["28px", { lineHeight: "1.3" }],
      },
      maxWidth: {
        content: "720px",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        none: "0px",
        card: "6px",
        input: "6px",
        button: "6px",
        sidebar: "0px",
        page: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
