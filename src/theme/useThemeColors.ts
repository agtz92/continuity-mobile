import { useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { THEME_SURFACES } from "./tokens";
import { PALETTE_SWATCHES } from "../palette/config";

export type ThemeColors = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accent2: string;
};

/**
 * Resolved hex/rgba theme colors for the active theme + palette. Use these for
 * things className can't express in this setup: lucide icon `color` props and
 * opacity over a theme color (RN has no `color-mix`, and `bg-accent/15` over a
 * `var()` hex doesn't apply — see frontend CLAUDE.md). Solid theme colors
 * (`bg-accent`, `text-text-muted`, …) still work as className.
 */
export function useThemeColors(): ThemeColors {
  const { effective, palette } = useTheme();
  return useMemo(() => {
    const s = THEME_SURFACES[effective];
    const [accent, accent2] = PALETTE_SWATCHES[palette][effective];
    return {
      bg: s.bg,
      surface: s.surface,
      border: s.border,
      text: s.text,
      textMuted: s.textMuted,
      accent,
      accent2,
    };
  }, [effective, palette]);
}

/** `#rrggbb` (or `#rgb`) → `rgba(r, g, b, a)`. Only safe on hex inputs. */
export function alpha(hex: string, a: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Fixed Tailwind palette swatches (base = -500, text = -400) for category colors
// that don't map onto the theme accents. emerald→accent, blue→accent-2 resolve
// from the palette so they track the user's theme.
const FIXED_CATEGORY: Record<string, { base: string; text: string }> = {
  purple: { base: "168,85,247", text: "192,132,252" },
  amber: { base: "245,158,11", text: "251,191,36" },
  rose: { base: "244,63,94", text: "251,113,133" },
  cyan: { base: "6,182,212", text: "34,211,238" },
  indigo: { base: "99,102,241", text: "129,140,248" },
  pink: { base: "236,72,153", text: "244,114,182" },
  lime: { base: "132,204,22", text: "163,230,53" },
  orange: { base: "249,115,22", text: "251,146,60" },
};

export type CategoryChipColors = {
  bg: string;
  text: string;
  border: string;
  dot: string;
};

/** RN-resolved version of `categoryColorClass` (which emits class strings the
 * theme-opacity quirk would drop). Mirrors the same color→swatch mapping. */
export function categoryChipColors(
  color: string,
  c: ThemeColors
): CategoryChipColors {
  if (color === "blue") {
    return {
      bg: alpha(c.accent2, 0.15),
      text: c.accent2,
      border: alpha(c.accent2, 0.3),
      dot: c.accent2,
    };
  }
  const f = FIXED_CATEGORY[color];
  if (f) {
    return {
      bg: `rgba(${f.base},0.15)`,
      text: `rgb(${f.text})`,
      border: `rgba(${f.base},0.3)`,
      dot: `rgb(${f.text})`,
    };
  }
  // emerald + unknown fallback → theme accent (matches web's emerald default)
  return {
    bg: alpha(c.accent, 0.15),
    text: c.accent,
    border: alpha(c.accent, 0.3),
    dot: c.accent,
  };
}
