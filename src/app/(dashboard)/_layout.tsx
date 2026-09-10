import { useMemo } from "react";
import { Tabs } from "expo-router";
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
import { DashboardTour } from "@/components/onboarding/DashboardTour";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t("tabs.today"),
          tabBarIcon: ({ color, size }) => <Sun color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t("tabs.projects"),
          tabBarIcon: ({ color, size }) => (
            <FolderKanban color={color} size={size} />
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
            <ListChecks color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t("tabs.routines"),
          tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: t("tabs.more"),
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
    <DashboardTour />
    </>
  );
}

// `expo-router` monta esto en vez de dejar el hueco en blanco cuando una
// pantalla de este árbol revienta al renderizar. Ver `ui/RouteError`.
export { RouteError as ErrorBoundary } from "@/components/ui/RouteError";
