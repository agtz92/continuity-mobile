import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Figure } from "@/components/ui/Figure";
import { Meta } from "@/components/ui/Meta";
import { lift } from "@/theme/lift";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton, TextButton } from "../controls";

/**
 * La ficha del tour (variante 1a del handoff): numeral en display, espina de
 * acento al borde y el texto debajo.
 *
 * **No conoce ningún paso.** Recibe el número, el texto y tres callbacks. Eso
 * es lo que permite que el guion viva entero en `steps.ts`: si mañana el tour
 * tiene catorce pasos, este archivo no se entera.
 *
 * Dos desvíos del handoff, los dos por respetar lo que ya existe:
 *
 * - **Sombra.** El handoff pedía sombra dura con desplazamiento. Aquí se usa
 *   `lift("float")`, que es la única sombra con permiso en la app (AGENTS.md).
 *   Una sombra propia para el tour sería el único sitio de la app con una.
 * - **Espina.** Es una barra de acento dibujada aquí, no el primitivo `Spine`:
 *   aquel codifica **estado de proyecto** y no tiene un valor honesto que dar
 *   para una ficha de onboarding. Se toma el lenguaje visual, no el contrato.
 */
export function TourCard({
  index,
  total,
  title,
  body,
  onNext,
  onBack,
  onSkip,
  onLayout,
}: {
  /** Base 0. La ficha lo presenta en base 1, con cero a la izquierda. */
  index: number;
  total: number;
  title: string;
  body: string;
  onNext: () => void;
  /** Ausente en el primer paso: no hay a dónde volver. */
  onBack?: () => void;
  onSkip: () => void;
  onLayout?: (h: number) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const last = index === total - 1;

  return (
    <View
      className="flex-row overflow-hidden rounded-xl border border-border bg-surface"
      style={lift("float", c)}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.height)}
    >
      {/* La espina. 3px, acento: esto es lo que pide tu atención ahora. */}
      <View style={{ width: 3, backgroundColor: c.accent }} />

      <View className="min-w-0 flex-1 gap-3 p-5">
        <View className="flex-row items-baseline gap-2">
          <Figure size={22} tone={c.text5}>
            {String(index + 1).padStart(2, "0")}
          </Figure>
          <Meta tone="faint">/ {String(total).padStart(2, "0")}</Meta>
        </View>

        <Text
          className="font-display text-2xl text-text"
          style={{ letterSpacing: -0.4 }}
        >
          {title}
        </Text>
        <Text className="font-sans text-base leading-relaxed text-text-2">
          {body}
        </Text>

        {/* Una marca por paso, contables. Mismo lenguaje que el progreso de
            tareas: bloques, no barra. */}
        <View className="flex-row" style={{ gap: 2 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 4,
                flex: 1,
                backgroundColor: i <= index ? c.accent : c.line[14],
              }}
            />
          ))}
        </View>

        <View className="flex-row items-center justify-between gap-3 pt-1">
          <View className="flex-row items-center gap-4">
            <TextButton label={t("onboarding.tour.skip")} onPress={onSkip} />
            {onBack ? (
              <TextButton label={t("onboarding.tour.back")} onPress={onBack} />
            ) : null}
          </View>
          <PrimaryButton
            label={t(last ? "onboarding.tour.done" : "onboarding.tour.next")}
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}
