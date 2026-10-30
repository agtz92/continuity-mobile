import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";

import { selectionFeedback } from "@/lib/feedback";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_LABEL_KEY, type Theme } from "@/theme/config";
import { SIZE, THEME_SURFACES, type EffectiveMode } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";
import {
  SUPPORTED_PALETTES,
  PALETTE_LABEL_KEY,
  accentsFor,
  type Palette,
} from "@/palette/config";

/**
 * Selectores de tema y paleta compartidos por Appearance (`(more)/appearance`)
 * y el primer paso del onboarding (`StepTheme`): si uno cambia, cambian los dos.
 *
 * - Tema: tres **muestras reales** de 84 px — fondo del tema, regla de acento,
 *   nombre y check en la activa — más la fila "System" (sigue al dispositivo),
 *   que no tiene superficie propia que enseñar.
 * - Paleta: cinco celdas de 72 px con un círculo de 24 del acento.
 * - Barra de vocabulario: lo que la paleta cambia frente a lo que nunca cambia.
 */

const MODES: EffectiveMode[] = ["continuu", "light", "carbon"];

const ThemeSwatch = memo(function ThemeSwatch({
  mode,
  active,
  label,
  onPick,
}: {
  mode: EffectiveMode;
  active: boolean;
  label: string;
  onPick: (mode: EffectiveMode) => void;
}) {
  const c = useThemeColors();
  const { palette } = useTheme();
  const s = THEME_SURFACES[mode];
  const [accent] = accentsFor(palette, mode);
  return (
    <Pressable
      onPress={() => onPick(mode)}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className="flex-1 justify-between active:opacity-80"
      style={{
        height: 84,
        borderRadius: 10,
        padding: 12,
        backgroundColor: s.bg,
        borderWidth: active ? 2 : 1,
        borderColor: active ? c.accent : c.line[18],
      }}
    >
      <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: accent }} />
      <View className="flex-row items-center justify-between" style={{ gap: 4 }}>
        <Text className="font-sans-semibold flex-shrink" numberOfLines={1} style={{ fontSize: 14, color: s.text }}>
          {label}
        </Text>
        {active ? <Check size={14} color={accent} /> : null}
      </View>
    </Pressable>
  );
});

export function ThemeSwatches({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (next: Theme) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const pick = (next: Theme) => {
    if (next === value) return;
    selectionFeedback();
    onChange(next);
  };
  const systemOn = value === "system";
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      <View className="flex-row" style={{ gap: 8 }}>
        {MODES.map((m) => (
          <ThemeSwatch
            key={m}
            mode={m}
            active={value === m}
            label={t(`settings.appearance.${THEME_LABEL_KEY[m]}`)}
            onPick={pick}
          />
        ))}
      </View>
      <Pressable
        onPress={() => pick("system")}
        accessibilityRole="radio"
        accessibilityState={{ checked: systemOn }}
        accessibilityLabel={t("settings.appearance.themeSystem")}
        className="flex-row items-center self-start active:opacity-70"
        style={{ minHeight: SIZE.hit, gap: 10, paddingRight: 8 }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 20,
            height: 20,
            borderWidth: systemOn ? 0 : 1.5,
            borderColor: c.line[34],
            backgroundColor: systemOn ? c.accent : "transparent",
          }}
        >
          {systemOn ? <Check size={12} color={c.bg} /> : null}
        </View>
        <Text className="font-sans-medium" style={{ fontSize: 15, color: systemOn ? c.text : c.text2 }}>
          {t("settings.appearance.themeSystem")}
        </Text>
      </Pressable>
    </View>
  );
}

const PaletteCell = memo(function PaletteCell({
  palette,
  active,
  label,
  onPick,
}: {
  palette: Palette;
  active: boolean;
  label: string;
  onPick: (p: Palette) => void;
}) {
  const c = useThemeColors();
  const { effective } = useTheme();
  const [accent] = accentsFor(palette, effective);
  return (
    <Pressable
      onPress={() => onPick(palette)}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className="flex-1 items-center justify-center active:opacity-80"
      style={{
        height: 72,
        borderRadius: 10,
        gap: 8,
        paddingHorizontal: 2,
        backgroundColor: c.surface,
        borderWidth: active ? 2 : 1,
        borderColor: active ? c.accent : c.line[14],
      }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: accent }} />
      {/* Etiqueta de control (no título): cinco celdas en 350 px obligan a
          encoger antes que a cortar. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className="font-sans-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 0.6, color: active ? c.text : c.text3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export function PaletteSwatches({
  value,
  onChange,
}: {
  value: Palette;
  onChange: (next: Palette) => void;
}) {
  const { t } = useTranslation();
  const pick = (next: Palette) => {
    if (next === value) return;
    selectionFeedback();
    onChange(next);
  };
  return (
    <View className="flex-row" style={{ gap: 6 }} accessibilityRole="radiogroup">
      {SUPPORTED_PALETTES.map((p) => (
        <PaletteCell
          key={p}
          palette={p}
          active={value === p}
          label={t(`settings.appearance.${PALETTE_LABEL_KEY[p]}`)}
          onPick={pick}
        />
      ))}
    </View>
  );
}

/**
 * El vocabulario entero, no dos acentos: lo que la paleta cambia (acento y su
 * segundo) y lo que no cambia nunca (lo que duele, lo que se cerró y la
 * tinta). Proporción 3 : 1 : 1 : 1 : 1.
 */
export function VocabularyBar() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const seg = { height: 10, borderRadius: 2 } as const;
  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row" style={{ gap: 3 }}>
        <View className="bg-accent" style={[seg, { flex: 3 }]} />
        <View className="bg-accent-2" style={[seg, { flex: 1 }]} />
        <View style={[seg, { flex: 1, backgroundColor: c.signal }]} />
        <View style={[seg, { flex: 1, backgroundColor: c.closed }]} />
        <View style={[seg, { flex: 1, backgroundColor: c.line[34] }]} />
      </View>
      <View className="flex-row justify-between" style={{ gap: 8 }}>
        <Text className="font-sans-semibold uppercase" style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}>
          {t("settings.appearance.vocabAccent")}
        </Text>
        <Text className="font-sans-semibold uppercase" style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}>
          {t("settings.appearance.vocabFixed")}
        </Text>
      </View>
    </View>
  );
}
