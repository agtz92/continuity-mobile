/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Type scale calibrated UP for mobile readability (iOS body ≈ 17px; the
      // Tailwind defaults are desktop-sized and read small on a phone). Only the
      // absolute sizes shift — the hierarchy is preserved, so no added clutter.
      // Headings (2xl+) keep the Tailwind defaults. Tuples are [fontSize, lineHeight].
      fontSize: {
        xs: ["13px", "18px"],
        sm: ["15px", "21px"],
        base: ["17px", "25px"],
        lg: ["19px", "28px"],
        xl: ["21px", "30px"],
      },
      colors: {
        // Driven at runtime by ThemeProvider via NativeWind `vars()`.
        // 3 base themes set surfaces; the active palette overrides accent/accent-2.
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
      },
    },
  },
  plugins: [],
};
