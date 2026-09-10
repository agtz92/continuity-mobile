import { View } from "react-native";

import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "./Meta";

/** A partir de aquí el proyecto se considera camino del cementerio. */
const GRAVE_DAYS = 90;

/**
 * Los días sin tocar, con escala.
 *
 * "97 d" junto a "3 d" con el mismo cuerpo no significa nada. Aquí la cifra
 * **crece** según el tramo y una regla de 3px se llena hacia el cementerio: el
 * enfriamiento se dice con el peso de la tinta, no con una alarma. Un proyecto
 * frío no es una emergencia, es algo que se está apagando en silencio.
 */
export function CoolingRule({
  days,
  cooling,
  showRule = true,
}: {
  days: number;
  /** Tramo derivado en el servidor. Sin él se calcula aquí, con los mismos cortes. */
  cooling?: "warm" | "cool" | "cold";
  showRule?: boolean;
}) {
  const c = useThemeColors();
  const band = cooling ?? (days > 21 ? "cold" : days > 7 ? "cool" : "warm");

  const size = band === "cold" ? 22 : band === "cool" ? 18 : 15;
  const color = band === "cold" ? c.text : band === "cool" ? c.text3 : c.text5;
  const filled = Math.max(0, Math.min(1, days / GRAVE_DAYS));

  return (
    <View style={{ alignItems: "flex-end", gap: 4 }}>
      <Meta
        variant="dato"
        tone="inherit"
        style={{ fontSize: size, lineHeight: size + 2, color }}
      >
        {days}
      </Meta>
      {showRule ? (
        <View style={{ width: 34, height: 3, backgroundColor: c.line[8] }}>
          <View
            style={{
              height: 3,
              width: `${filled * 100}%`,
              backgroundColor: band === "cold" ? c.text3 : c.line[34],
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
