import { useMemo } from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { PlatformPressable } from "@react-navigation/elements";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import {
  FolderKanban,
  ListChecks,
  Menu,
  Repeat,
  Sun,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { accentsFor } from "@/palette/config";
import { DashboardTour } from "@/components/onboarding/tour/DashboardTour";
import { TourAnchor } from "@/components/onboarding/tour/TourAnchor";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePurchasesIdentity } from "@/hooks/usePurchasesIdentity";
import { useDashboardData } from "@/hooks/useDashboardData";
import { projectIsBlocked, taskIsBlocked } from "@/lib/cooling";
import { isDailyViewStatus } from "@/lib/projectStatus";

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { effective, palette } = useTheme();
  const surfaces = THEME_SURFACES[effective];
  const [accent] = accentsFor(palette, effective);

  // Push registration + tap-to-navigate (Fase 8). Inert under Expo Go.
  usePushNotifications();
  // Ata las compras al uuid del usuario. Sin esto el webhook descarta la
  // compra por id anónimo: se cobra y el plan no se mueve.
  usePurchasesIdentity();

  // Globo de atascos sobre "Proyectos". El rediseño lo pide porque un proyecto
  // atorado es lo único que la app **no** puede resolver sola: si no se ve
  // desde cualquier pestaña, se queda ahí semanas.
  //
  // `tabBarBadge` es de react-navigation v7 y NO choca con `animation:"shift"`
  // —uno anima la transición, el otro pinta encima del icono—, pero el tinte
  // sí hay que fijarlo: `tabBarBadgeStyle` no hereda `tabBarActiveTintColor`.
  const { projects, tasks } = useDashboardData();
  const blockedCount = useMemo(() => {
    const withBlocked = new Set(
      tasks.filter((tk) => !tk.done && taskIsBlocked(tk)).map((tk) => tk.projectId)
    );
    return projects.filter(
      (p) => isDailyViewStatus(p.status) && projectIsBlocked(p, withBlocked.has(p.id) ? 1 : 0)
    ).length;
  }, [projects, tasks]);

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        // La transición entre pestañas (`animation:"shift"`) está QUITADA a
        // propósito: es el otro sospechoso de la pantalla en blanco, porque es
        // justo lo que corre al tocar la barra. Si tras el arreglo de
        // `CollapsibleSection` el problema no vuelve, se puede reponer.
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: surfaces.textMuted,
        tabBarStyle: {
          backgroundColor: surfaces.surface,
          borderTopColor: surfaces.border,
        },
        // Etiqueta a 11 px (600 en la activa). El color solo no basta para
        // saber dónde estás: la activa lleva además una regla de 2 px arriba.
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={{
              fontSize: 11,
              color,
              fontFamily: focused ? "SchibstedGrotesk_600SemiBold" : "SchibstedGrotesk_500Medium",
            }}
          >
            {children}
          </Text>
        ),
        tabBarButton: (props: BottomTabBarButtonProps) => (
          <TabButton {...props} accent={accent} />
        ),
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t("tabs.today"),
          tabBarIcon: ({ color, size }) => (
            <TourAnchor id="tab.today">
              <Sun color={color} size={size} />
            </TourAnchor>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t("tabs.projects"),
          tabBarIcon: ({ color, size }) => (
            <TourAnchor id="tab.projects">
              <FolderKanban color={color} size={size} />
            </TourAnchor>
          ),
          tabBarBadge: blockedCount > 0 ? blockedCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: surfaces.signal,
            color: surfaces.bg,
            fontSize: 10,
            fontFamily: "SchibstedGrotesk_600SemiBold",
          },
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("tabs.tasks"),
          tabBarIcon: ({ color, size }) => (
            <TourAnchor id="tab.tasks">
              <ListChecks color={color} size={size} />
            </TourAnchor>
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t("tabs.routines"),
          tabBarIcon: ({ color, size }) => (
            <TourAnchor id="tab.routines">
              <Repeat color={color} size={size} />
            </TourAnchor>
          ),
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: t("tabs.more"),
          tabBarIcon: ({ color, size }) => (
            <TourAnchor id="tab.more">
              <Menu color={color} size={size} />
            </TourAnchor>
          ),
        }}
      />
    </Tabs>
    <DashboardTour />
    </>
  );
}

/**
 * Botón de pestaña con la regla superior de 2 px en `accent` cuando está
 * activa. Va en `tabBarButton` (no en el icono) para que la regla toque el
 * borde de la barra sin depender del padding del icono.
 */
function TabButton({
  accent,
  children,
  style,
  ...rest
}: BottomTabBarButtonProps & { accent: string }) {
  const focused = rest["aria-selected"] === true;
  return (
    <PlatformPressable {...rest} style={[style, { position: "relative" }]}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: "22%",
          right: "22%",
          height: 2,
          backgroundColor: focused ? accent : "transparent",
        }}
      />
      {children}
    </PlatformPressable>
  );
}

// `expo-router` monta esto en vez de dejar el hueco en blanco cuando una
// pantalla de este árbol revienta al renderizar. Ver `ui/RouteError`.
export { RouteError as ErrorBoundary } from "@/components/ui/RouteError";
