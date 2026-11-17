import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.25rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        blush: "hsl(var(--blush) / <alpha-value>)",
        lavender: "hsl(var(--lavender) / <alpha-value>)",
        sage: "hsl(var(--sage) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-strong": "hsl(var(--accent-strong) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        serif: ['"Shippori Mincho B1"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: { card: "24px" },
      boxShadow: {
        soft: "0 1px 2px rgb(53 49 47 / 0.04), 0 8px 28px -12px rgb(53 49 47 / 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
