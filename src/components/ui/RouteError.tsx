import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "./Meta";

/**
 * Lo que se ve cuando una pantalla revienta al renderizar.
 *
 * Antes no había ninguno, y eso es lo que convertía cualquier error de render
 * en **una pantalla en blanco con la barra de pestañas encima**: la barra vive
 * en el layout y sobrevive, el contenido no, y nadie te decía por qué. Un fallo
 * sin mensaje no se puede ni reportar.
 *
 * `expo-router` recoge cualquier `ErrorBoundary` exportado desde un archivo de
 * ruta, así que basta con reexportar esto desde los layouts.
 *
 * El detalle técnico va detrás de un toque: al usuario le sirve "algo se rompió
 * y puedes reintentar"; a quien recibe el reporte le sirve el stack.
 */
export function RouteError({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  return (
    <View className="flex-1 justify-center px-6" style={{ backgroundColor: c.bg }}>
      <View style={{ width: 44, height: 3, backgroundColor: c.signal }} />
      <Text
        className="mt-5 font-display"
        style={{ fontSize: 26, lineHeight: 29, letterSpacing: -0.8, color: c.text }}
      >
        {t("routeError.title")}
      </Text>
      <Text className="mt-3 font-sans text-base text-text-3">
        {t("routeError.body")}
      </Text>

      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        className="mt-5 self-start rounded-md border px-4 py-2"
        style={{ borderColor: c.accent }}
      >
        <Text className="font-sans-medium text-sm" style={{ color: c.accent }}>
          {t("routeError.retry")}
        </Text>
      </Pressable>

      <Meta variant="cintillo" tone="faint" className="mt-7">
        {t("routeError.detailLabel")}
      </Meta>
      <ScrollView
        className="mt-2 max-h-40 rounded-md border p-3"
        style={{ borderColor: c.line[14], backgroundColor: c.line[4] }}
      >
        <Text className="font-sans text-xs" style={{ color: c.text5 }}>
          {error?.message || String(error)}
          {error?.stack ? `\n\n${error.stack}` : ""}
        </Text>
      </ScrollView>
    </View>
  );
}
