import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Meta } from "@/components/ui/Meta";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Sección del detalle de proyecto (1g): cintillo + regla de 1 px que llena el
 * ancho + conteo a la derecha ("3 open · 1 done"). La separación entre
 * secciones (28 px) la pone la pantalla.
 */
export function ProjectSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string | null;
  children: ReactNode;
}) {
  const c = useThemeColors();
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3" accessible accessibilityRole="header">
        <Meta variant="cintillo" tone="muted">
          {title}
        </Meta>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line[14] }} />
        {meta ? <Meta tone="muted">{meta}</Meta> : null}
      </View>
      {children}
    </View>
  );
}

/** Texto corrido de una sección (Why it matters, Description) o su vacío en cursiva. */
export function ProjectProse({ text, empty }: { text: string; empty: string }) {
  const c = useThemeColors();
  return (
    <Text
      className={text ? "font-sans" : "font-sans italic"}
      style={{ fontSize: 16, lineHeight: 23, color: text ? c.text2 : c.text3 }}
    >
      {text || empty}
    </Text>
  );
}
