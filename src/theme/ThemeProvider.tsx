import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { View, useColorScheme } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_THEME, isTheme, type Theme } from "./config";
import { THEME_SURFACES, type EffectiveMode } from "./tokens";
import {
  DEFAULT_PALETTE,
  isPalette,
  PALETTE_SWATCHES,
  type Palette,
} from "../palette/config";

const THEME_KEY = "continuity.theme";
const PALETTE_KEY = "continuity.palette";

type ThemeContextValue = {
  theme: Theme;
  palette: Palette;
  effective: EffectiveMode;
  setTheme: (t: Theme) => void;
  setPalette: (p: Palette) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Builds the NativeWind vars() style for a given theme/palette. Lives here so it
// can be re-applied anywhere the provider's wrapping View doesn't reach — e.g.
// inside an RN <Modal>, which renders in a separate host tree and otherwise
// loses the CSS variables (--bg, --accent, …) that className utilities resolve.
function buildThemeVars(effective: EffectiveMode, palette: Palette) {
  const s = THEME_SURFACES[effective];
  const [accent, accent2] = PALETTE_SWATCHES[palette][effective];
  return vars({
    "--bg": s.bg,
    "--surface": s.surface,
    "--border": s.border,
    "--text": s.text,
    "--text-muted": s.textMuted,
    "--accent": accent,
    "--accent-2": accent2,
  });
}

export function useThemeVars() {
  const { effective, palette } = useTheme();
  return useMemo(() => buildThemeVars(effective, palette), [effective, palette]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [palette, setPaletteState] = useState<Palette>(DEFAULT_PALETTE);

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(PALETTE_KEY),
      ]);
      if (isTheme(t)) setThemeState(t);
      if (isPalette(p)) setPaletteState(p);
    })();
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    void AsyncStorage.setItem(THEME_KEY, t);
  };
  const setPalette = (p: Palette) => {
    setPaletteState(p);
    void AsyncStorage.setItem(PALETTE_KEY, p);
  };

  // "system" resolves to light/dark (never to continuuit), matching web.
  const effective: EffectiveMode =
    theme === "system" ? (system === "dark" ? "dark" : "light") : theme;

  const style = useMemo(
    () => buildThemeVars(effective, palette),
    [effective, palette],
  );

  return (
    <ThemeContext.Provider
      value={{ theme, palette, effective, setTheme, setPalette }}
    >
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}
