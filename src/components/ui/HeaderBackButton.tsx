import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";

import { SIZE, type Surfaces } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * La flecha de volver de toda la app, con el **nombre del destino** al lado
 * ("Projects", "Notes", "More"): cada pantalla dice adónde lleva "atrás".
 *
 * La nativa de iOS es un chevron fino, a veces etiquetado con el título de la
 * pantalla anterior, y los usuarios no notaban que el header era tocable. Esta
 * es explícita, temática, con flecha de 24 px en caja de 44.
 */
export function HeaderBackButton({
  canGoBack,
  label,
}: {
  canGoBack?: boolean;
  /** Nombre de la pantalla a la que vuelve. */
  label?: string;
}) {
  const router = useRouter();
  const c = useThemeColors();
  const { t } = useTranslation();

  if (canGoBack === false) return null;

  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={label ? `${t("common.back")}: ${label}` : t("common.back")}
      className="flex-row items-center active:opacity-60"
      style={{ height: SIZE.hit, paddingRight: 8 }}
    >
      <View
        style={{ width: SIZE.hit, height: SIZE.hit, alignItems: "center", justifyContent: "center" }}
      >
        <ArrowLeft size={24} color={c.text} />
      </View>
      {label ? (
        <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text2 }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Las opciones de header compartidas por **todos** los stacks con cabecera.
 *
 * `backLabel` es el nombre del destino. Con `bare` la cabecera no lleva título:
 * la pantalla abre con su propio `ScreenHeadline` y el título nativo, truncado
 * al centro, solo duplicaba lo que el titular ya dice.
 */
export function headerOptionsFor(
  s: Surfaces,
  { backLabel, bare = false }: { backLabel?: string; bare?: boolean } = {},
) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: bare ? s.bg : s.surface },
    headerTintColor: s.text,
    headerTitleStyle: { color: s.text },
    headerShadowVisible: false,
    headerBackVisible: false,
    ...(bare ? { headerTitle: "" } : null),
    // Padding explícito: es lo que hace que la flecha caiga en el mismo sitio
    // en los dos stacks.
    headerLeftContainerStyle: { paddingLeft: 4 },
    headerRightContainerStyle: { paddingRight: 8 },
    headerLeft: (props: { canGoBack?: boolean }) => (
      <HeaderBackButton canGoBack={props.canGoBack} label={backLabel} />
    ),
  } as const;
}
