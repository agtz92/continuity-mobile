export const SUPPORTED_PALETTES = [
  "default",
  "continuuit",
  "pink",
  "business",
  "neon",
  "green",
  "turquoise",
  "cute",
  "midnight",
  "boho",
  "complimentary",
  "sunset",
  "retro",
] as const;
export type Palette = (typeof SUPPORTED_PALETTES)[number];
export const DEFAULT_PALETTE: Palette = "default";

export const PALETTE_COOKIE = "NEXT_PALETTE";

export function isPalette(value: unknown): value is Palette {
  return (
    typeof value === "string" &&
    (SUPPORTED_PALETTES as readonly string[]).includes(value)
  );
}

export const PALETTE_LABEL_KEY: Record<Palette, string> = {
  default: "paletteDefault",
  continuuit: "paletteContinuuit",
  pink: "palettePink",
  business: "paletteBusiness",
  neon: "paletteNeon",
  green: "paletteGreen",
  turquoise: "paletteTurquoise",
  cute: "paletteCute",
  midnight: "paletteMidnight",
  boho: "paletteBoho",
  complimentary: "paletteComplimentary",
  sunset: "paletteSunset",
  retro: "paletteRetro",
};

/**
 * Hex pairs (accent, accent-2) shown as small swatches next to each option.
 * Kept in sync with the CSS overrides in globals.css. One pair per theme
 * variant: the selector picks the right pair based on the active theme so
 * the swatch always previews what you'll actually see. Under the continuuit
 * theme the `default` palette resolves to the brand accents (ochre +
 * vermillion); every other palette mirrors its dark accents since the
 * continuuit palette overrides reuse those values.
 */
export const PALETTE_SWATCHES: Record<
  Palette,
  { dark: [string, string]; light: [string, string]; continuuit: [string, string] }
> = {
  default: {
    dark: ["#34d399", "#60a5fa"],
    light: ["#4f46e5", "#d97706"],
    continuuit: ["#D4A847", "#F08C5C"],
  },
  continuuit: {
    dark: ["#D4A847", "#F08C5C"],
    light: ["#D4A847", "#F08C5C"],
    continuuit: ["#D4A847", "#F08C5C"],
  },
  pink: {
    dark: ["#f472b6", "#e879f9"],
    light: ["#db2777", "#c026d3"],
    continuuit: ["#f472b6", "#e879f9"],
  },
  business: {
    dark: ["#93c5fd", "#94a3b8"],
    light: ["#1d4ed8", "#475569"],
    continuuit: ["#93c5fd", "#94a3b8"],
  },
  neon: {
    dark: ["#a3e635", "#22d3ee"],
    light: ["#008BFF", "#9929EA"],
    continuuit: ["#a3e635", "#22d3ee"],
  },
  green: {
    dark: ["#6FCF97", "#2FA084"],
    light: ["#0F8A5C", "#155F4A"],
    continuuit: ["#6FCF97", "#2FA084"],
  },
  turquoise: {
    dark: ["#5DF8D8", "#6FD1D7"],
    light: ["#0D9488", "#0E7490"],
    continuuit: ["#5DF8D8", "#6FD1D7"],
  },
  cute: {
    dark: ["#C0E1D2", "#DC9B9B"],
    light: ["#EF88AD", "#9BC09C"],
    continuuit: ["#C0E1D2", "#DC9B9B"],
  },
  midnight: {
    dark: ["#A5B4FC", "#818CF8"],
    light: ["#080616", "#1A1953"],
    continuuit: ["#A5B4FC", "#818CF8"],
  },
  boho: {
    dark: ["#CAAA98", "#9A8678"],
    light: ["#DF9152", "#A3573A"],
    continuuit: ["#CAAA98", "#9A8678"],
  },
  complimentary: {
    dark: ["#F0E9B6", "#B891C2"],
    light: ["#62109F", "#EEA727"],
    continuuit: ["#F0E9B6", "#B891C2"],
  },
  sunset: {
    dark: ["#EA5252", "#FF9D23"],
    light: ["#CF0F0F", "#E67E22"],
    continuuit: ["#EA5252", "#FF9D23"],
  },
  retro: {
    dark: ["#FF9B51", "#7A9CB3"],
    light: ["#C46817", "#25343F"],
    continuuit: ["#FF9B51", "#7A9CB3"],
  },
};
