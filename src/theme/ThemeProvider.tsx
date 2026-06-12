import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, View, useColorScheme } from "react-native";
import { vars } from "nativewind";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/lib/auth";
import { NOTIFICATION_SETTINGS_QUERY } from "@/lib/graphql";
import { isLocale, persistLocale } from "@/lib/locale";
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
  // Becomes true once the locally-persisted theme/palette have been read. The
  // splash is held until then so the first painted frame is already in the
  // user's theme (no default→stored flip flash).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(PALETTE_KEY),
        ]);
        if (isTheme(t)) setThemeState(t);
        if (isPalette(p)) setPaletteState(p);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Appearance is owned per-user on the backend. Hydrate from it so changes made
  // on web (or another device) reflect here — on launch AND whenever the app
  // returns to the foreground (so switching from desktop to phone Just Works,
  // no full restart). A mobile change also writes to the backend, so re-applying
  // is consistent; we only apply on first load + explicit foreground refetch
  // (fresh network data), never on the reactive cache, so a local edit mid-
  // session isn't clobbered.
  const { session, loading: authLoading } = useAuth();

  // Hide the native splash once the theme is hydrated AND auth has resolved, so
  // the first visible frame is the correct screen in the correct theme rather
  // than a blank/default flash. preventAutoHideAsync() is called in _layout.tsx.
  useEffect(() => {
    if (hydrated && !authLoading) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, authLoading]);

  const { data: settings, refetch } = useQuery<{
    notificationSettings: {
      theme?: string | null;
      palette?: string | null;
      locale?: string | null;
    } | null;
  }>(NOTIFICATION_SETTINGS_QUERY, {
    skip: !session,
    fetchPolicy: "cache-and-network",
  });

  const applyServerSettings = useCallback(
    (s: {
      theme?: string | null;
      palette?: string | null;
      locale?: string | null;
    }) => {
      if (isTheme(s.theme)) {
        setThemeState(s.theme);
        void AsyncStorage.setItem(THEME_KEY, s.theme);
      }
      if (isPalette(s.palette)) {
        setPaletteState(s.palette);
        void AsyncStorage.setItem(PALETTE_KEY, s.palette);
      }
      if (isLocale(s.locale)) void persistLocale(s.locale);
    },
    [],
  );

  // Initial hydration, once per signed-in user.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid || hydratedFor.current === uid) return;
    const s = settings?.notificationSettings;
    if (!s) return;
    hydratedFor.current = uid;
    applyServerSettings(s);
  }, [settings, session, applyServerSettings]);

  // Re-sync on foreground (changed theme on web, then picked up the phone).
  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      refetch()
        .then((res) => {
          const s = res.data?.notificationSettings;
          if (s) applyServerSettings(s);
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [session, refetch, applyServerSettings]);

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
