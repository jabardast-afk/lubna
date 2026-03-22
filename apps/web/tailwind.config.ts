import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0D0A0F",
          surface: "#16111A",
          elevated: "#1E1824"
        },
        accent: {
          rose: "#C9748A",
          gold: "#D4A853",
          soft: "#8B6B8E"
        },
        text: {
          primary: "#F5EEF0",
          secondary: "#A896AB",
          muted: "#6B5A6E"
        },
        bubble: {
          user: "#2D1F33",
          lubna: "#1A1520"
        }
      },
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(201, 116, 138, 0.22)"
      },
      keyframes: {
        pulseRose: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.06)", opacity: "1" }
        },
        fadeRise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        pulseRose: "pulseRose 1.8s ease-in-out infinite",
        fadeRise: "fadeRise 500ms ease-out both"
      }
    }
  },
  plugins: []
} satisfies Config;
