import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF7",
        sidebar: "#F4F2EC",
        card: "#FFFFFF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#5C5C5A",
        border: "#E8E6E1",
        accent: "#DC4A2F",
        "accent-hover": "#C4391F",
        error: "#8A2D1F",
        skeleton: "#E8E6E1",
        "skeleton-shimmer": "#F4F2EC",
      },
      fontFamily: {
        sans: ["var(--bu-font-sans)", "Inter Tight", "system-ui", "sans-serif"],
        heading: ["var(--bu-font-serif)", "Source Serif 4", "Georgia", "serif"],
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
        card: "12px",
        input: "8px",
        button: "8px",
        sidebar: "0px",
        page: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
