import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "./Meta";

/**
 * Chip de categoría con **muesca izquierda**, nunca pastilla con borde: el
 * color vive en la muesca de 3px y el texto se queda neutro, para que veinte
 * chips en una lista no la conviertan en un semáforo.
 *
 * El canvas dibuja la muesca con `clip-path`, que no existe en RN. No hace
 * falta nada exótico: es un `<View>` de 3px con las esquinas izquierdas
 * redondeadas.
 *
 * El código de dos letras (CL, PR, CO) hace de ancla visual: en una lista densa
 * la columna de categoría se lee sin leer la palabra.
 */

/** "cliente" → "CL". Dos letras, caja alta, sin acentos. */
export function categoryCode(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  if (!clean) return "··";
  const words = clean.split(/\s+/);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function CategoryTag({
  name,
  color,
  code,
  /** Sin categoría: se dice, no se esconde. */
  loose = false,
}: {
  name?: string;
  color?: string;
  code?: string;
  loose?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  if (loose || !name) {
    return (
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 3,
            height: 12,
            backgroundColor: c.line[14],
            borderTopLeftRadius: 2,
            borderBottomLeftRadius: 2,
          }}
        />
        <Meta variant="cintillo" tone="faint">
          {`·· ${t("category.none")}`}
        </Meta>
      </View>
    );
  }

  const dot = categoryChipColors(color ?? "emerald", c).dot;

  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{
          width: 3,
          height: 12,
          backgroundColor: dot,
          borderTopLeftRadius: 2,
          borderBottomLeftRadius: 2,
        }}
      />
      <Meta variant="cintillo" tone="muted">
        {code ?? categoryCode(name)}
      </Meta>
      <Text className="text-[11px] font-sans-medium lowercase text-text-5">
        {name}
      </Text>
    </View>
  );
}
