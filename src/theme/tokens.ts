// Surface tokens per effective theme mode. Mirrors the three base-theme blocks
// in the web's globals.css. A palette only overrides accent/accent-2 (see
// PALETTE_SWATCHES in ../palette/config) — surfaces come from here.

export type EffectiveMode = "continuuit" | "light" | "dark";

export type Surfaces = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
};

export const THEME_SURFACES: Record<EffectiveMode, Surfaces> = {
  continuuit: {
    bg: "#1A1F4D",
    surface: "#3B4A7A",
    border: "rgba(250,247,242,0.12)",
    text: "#FAF7F2",
    textMuted: "#A8AAB8",
  },
  dark: {
    bg: "#09090b",
    surface: "#18181b",
    border: "#27272a",
    text: "#f4f4f5",
    textMuted: "#a1a1aa",
  },
  light: {
    bg: "#fafaf9",
    surface: "#ffffff",
    border: "#e7e5e4",
    text: "#1c1917",
    textMuted: "#78716c",
  },
};
