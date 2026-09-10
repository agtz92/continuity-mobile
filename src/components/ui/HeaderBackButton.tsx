import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";

import { useThemeColors } from "@/theme/useThemeColors";
import type { Surfaces } from "@/theme/tokens";

/**
 * La flecha de volver de toda la app.
 *
 * La nativa de iOS es un chevron fino, a veces etiquetado con el título de la
 * pantalla anterior, y los usuarios no notaban que el header era tocable. Esta
 * es explícita, temática y con un blanco de toque generoso.
 *
 * **Caja fija de 40×40 y sin márgenes negativos**: antes llevaba `-ml-1`, que
 * la alineaba bien dentro del stack `(more)` y mal en el stack raíz (donde vive
 * el detalle de proyecto), porque cada contenedor padea distinto. Una caja de
 * medidas propias no depende de eso.
 */
export function HeaderBackButton({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();
  const c = useThemeColors();
  const { t } = useTranslation();

  if (canGoBack === false) return null;

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      className="active:opacity-60"
      style={{
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ArrowLeft size={24} color={c.text} />
    </Pressable>
  );
}

/**
 * Las opciones de header compartidas por **todos** los stacks con cabecera.
 *
 * Vivían duplicadas en `(more)/_layout.tsx` y en `project/[id].tsx`, y por eso
 * el detalle de proyecto acabó con otra flecha y otra alineación. Un solo sitio
 * y no pueden volver a separarse.
 */
export function headerOptionsFor(s: Surfaces) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: s.surface },
    headerTintColor: s.text,
    headerTitleStyle: { color: s.text },
    headerShadowVisible: false,
    headerBackVisible: false,
    // Padding explícito: es lo que hace que la flecha caiga en el mismo sitio
    // en los dos stacks.
    headerLeftContainerStyle: { paddingLeft: 8 },
    headerRightContainerStyle: { paddingRight: 8 },
    headerLeft: (props: { canGoBack?: boolean }) => (
      <HeaderBackButton canGoBack={props.canGoBack} />
    ),
  } as const;
}
