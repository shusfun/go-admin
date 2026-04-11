/** @type {import('tailwindcss').Config} */
function colorToken(name) {
  return `hsl(var(${name}) / <alpha-value>)`;
}

const sharedTheme = {
  extend: {
    borderRadius: {
      lg: "var(--radius, 1rem)",
      md: "var(--radius-md, calc(var(--radius, 1rem) - 2px))",
      sm: "var(--radius-sm, calc(var(--radius, 1rem) - 6px))",
      control: "var(--radius-control, 0.625rem)",
      surface: "var(--radius-surface, 0.5rem)",
      overlay: "var(--radius-overlay, 0.75rem)",
    },
    boxShadow: {
      card: "var(--shadow-card)",
      soft: "var(--shadow-soft)",
    },
    colors: {
      accent: {
        DEFAULT: colorToken("--accent"),
        foreground: colorToken("--accent-foreground"),
      },
      background: colorToken("--background"),
      border: colorToken("--border"),
      card: {
        DEFAULT: colorToken("--card"),
        foreground: colorToken("--card-foreground"),
      },
      destructive: {
        DEFAULT: colorToken("--destructive"),
        foreground: colorToken("--destructive-foreground"),
      },
      foreground: colorToken("--foreground"),
      input: colorToken("--input"),
      muted: {
        DEFAULT: colorToken("--muted"),
        foreground: colorToken("--muted-foreground"),
      },
      popover: {
        DEFAULT: colorToken("--popover"),
        foreground: colorToken("--popover-foreground"),
      },
      primary: {
        DEFAULT: colorToken("--primary"),
        foreground: colorToken("--primary-foreground"),
      },
      ring: colorToken("--ring"),
      secondary: {
        DEFAULT: colorToken("--secondary"),
        foreground: colorToken("--secondary-foreground"),
      },
    },
    fontFamily: {
      display: ["var(--font-display)"],
      sans: ["var(--font-sans)"],
    },
  },
};

function createAppTailwindConfig(extraContent = []) {
  return {
    content: [
      "./index.html",
      "./src/**/*.{ts,tsx}",
      "../../packages/ui-admin/src/**/*.{ts,tsx}",
      ...extraContent,
    ],
    darkMode: ["class"],
    theme: sharedTheme,
    plugins: [],
  };
}

module.exports = {
  createAppTailwindConfig,
  sharedTheme,
};
