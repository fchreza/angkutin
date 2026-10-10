import type { Config } from "tailwindcss";

/**
 * Design token Papan Pindahan — diambil PERSIS dari docs/design-tokens.json
 * dan PRD-Enhanced.md §9. Jangan menebak nilai warna; semua ada di sini.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — emerald (aksi, gratis, WhatsApp)
        primary: {
          DEFAULT: "#059669",
          dark: "#047857",
          500: "#10B981",
          soft: "#ECFDF5",
        },
        // Accent — amber (urgensi tenggat < 48 jam)
        accent: {
          DEFAULT: "#D97706",
          bright: "#F59E0B",
          soft: "#FEF3C7",
          text: "#B45309",
        },
        surface: "#FFFFFF",
        appbg: "#F9FAFB",
        ink: {
          DEFAULT: "#111827",
          secondary: "#6B7280",
          mono: "#4B5563",
        },
        line: "#E5E7EB",
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        pill: "999px",
      },
      boxShadow: {
        fab: "0 8px 22px rgba(5,150,105,0.35)",
        modal: "0 20px 48px rgba(17,24,39,0.18)",
        card: "0 1px 3px rgba(17,24,39,0.06)",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
