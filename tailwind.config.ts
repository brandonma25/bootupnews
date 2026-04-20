import type { Config } from "tailwindcss";

const config: Config = {
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
        body: ["15px", { lineHeight: "1.6" }],
        "body-mobile": ["14px", { lineHeight: "1.6" }],
        "key-point": ["14px", { lineHeight: "1.6" }],
        "key-point-mobile": ["13px", { lineHeight: "1.6" }],
        label: ["14px", { lineHeight: "1.4" }],
        meta: ["12px", { lineHeight: "1.4" }],
        section: ["11px", { lineHeight: "1.4", fontWeight: "600" }],
        button: ["14px", { lineHeight: "1.4", fontWeight: "500" }],
        input: ["14px", { lineHeight: "1.5" }],
        "briefing-card": ["22px", { lineHeight: "1.2", fontWeight: "600" }],
        "briefing-card-mobile": ["18px", { lineHeight: "1.25", fontWeight: "600" }],
        "briefing-detail": ["28px", { lineHeight: "1.18", fontWeight: "600" }],
        "briefing-detail-mobile": ["22px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      maxWidth: {
        content: "720px",
      },
      borderRadius: {
        card: "6px",
        input: "6px",
        button: "6px",
        sidebar: "0px",
        page: "0px",
      },
    },
  },
};

export default config;
