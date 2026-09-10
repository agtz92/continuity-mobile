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

import { useAppFonts } from "@/theme/fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/lib/auth";
import { NOTIFICATION_SETTINGS_QUERY } from "@/lib/graphql";
import { isLocale, persistLocale } from "@/lib/locale";
import { DEFAULT_THEME, normalizeTheme, type Theme } from "./config";
import { LINE_STEPS, THEME_SURFACES, type EffectiveMode } from "./tokens";
import {
  accentsFor,
  DEFAULT_PALETTE,
  normalizePalette,
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
  const [accent, accentHi, accentLo] = accentsFor(palette, effective);

  // La rampa de reglas se emite como variables para que `border-line-14` y
  // compañía funcionen como clase. En RN no hay `color-mix`, así que se calcula
  // aquí una vez por tema en vez de en cada componente.
  const lineVars: Record<string, string> = {};
  for (const n of LINE_STEPS) {
    const [r, g, b] = s.lineRgb.split(",").map((x) => Number(x.trim()));
    lineVars[`--line-${n}`] = `rgba(${r}, ${g}, ${b}, ${n / 100})`;
  }

  return vars({
    "--canvas": s.canvas,
    "--bg": s.bg,
    "--surface": s.surface,
    "--surface-2": s.surface2,
    "--surface-3": s.surface3,
    "--well": s.well,
    "--text": s.text,
    "--text-2": s.text2,
    "--text-3": s.text3,
    "--text-4": s.text4,
    "--text-5": s.text5,
    "--text-off": s.textOff,
    "--signal": s.signal,
    "--closed": s.closed,
    "--toast-bg": s.toastBg,
    "--toast-text": s.toastText,
    "--accent": accent,
    "--accent-hi": accentHi,
    "--accent-lo": accentLo,
    ...lineVars,
    // Alias de compatibilidad. Mueren en la PR de limpieza.
    "--border": s.border,
    "--text-muted": s.textMuted,
    "--accent-2": s.accent2,
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
        // `normalize*` y no `is*`: lo guardado puede ser de antes del rediseño
        // (`continuuit`, `dark`, `pink`…) y hay que traducirlo, no descartarlo.
        const nt = normalizeTheme(t);
        const np = normalizePalette(p);
        if (nt) setThemeState(nt);
        if (np) setPaletteState(np);
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

  // Hide the native splash once the theme is hydrated, auth has resolved AND
  // las fuentes están registradas, so the first visible frame is the correct
  // screen in the correct theme **and la tipografía correcta** rather than a
  // blank/default flash. preventAutoHideAsync() is called in _layout.tsx.
  //
  // Las fuentes entran aquí y no en `_layout` porque este es el único sitio que
  // ya decide cuándo se puede pintar; tener dos gates es tener dos flashes.
  const fontsReady = useAppFonts();
  useEffect(() => {
    if (hydrated && !authLoading && fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hydrated, authLoading, fontsReady]);

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
      // Aquí estaba la divergencia: con `isTheme` (solo canónicos de la lista
      // VIEJA), un tema cambiado desde la web llegaba como `continuu`, no
      // validaba, y la app se quedaba con el suyo SIN AVISAR. Dos clientes
      // mostrando temas distintos y nadie sabiendo por qué.
      const nt = normalizeTheme(s.theme);
      if (nt) {
        setThemeState(nt);
        void AsyncStorage.setItem(THEME_KEY, nt);
      }
      const np = normalizePalette(s.palette);
      if (np) {
        setPaletteState(np);
        void AsyncStorage.setItem(PALETTE_KEY, np);
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

  // "system" resuelve a los dos temas neutros (nunca al de marca), igual que
  // en web: seguir al sistema es una preferencia de luz, no de identidad.
  const effective: EffectiveMode =
    theme === "system" ? (system === "dark" ? "carbon" : "light") : theme;

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
