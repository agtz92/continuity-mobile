import type { ReactNode } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Flag,
  Lightbulb,
  Moon,
  Repeat,
  Rocket,
  Sunset,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native";

import type { useTodayLayout } from "@/hooks/useTodayLayout";
import { TODAY_SECTIONS, type TodaySectionId, type TodaySectionMeta } from "@/lib/todaySections";
import { useThemeColors } from "@/theme/useThemeColors";
import { TodayCustomizeBar } from "./TodayCustomizeBar";
import { TodaySectionEditRow } from "./TodaySectionEditRow";

type Layout = ReturnType<typeof useTodayLayout>;

/**
 * Modo de edición del layout de Hoy: lista arrastrable para reordenar y
 * ocultar secciones. Reemplaza toda la pantalla mientras está activo.
 */
export function TodayLayoutEditor({ layout, onExit }: { layout: Layout; onExit: () => void }) {
  const { t } = useTranslation();
  const c = useThemeColors();

  const ICON: Record<TodaySectionId, ReactNode> = {
    counters: <TrendingUp size={18} color={c.text3} />,
    "stalled-alert": <Bell size={18} color={c.accent} />,
    "today-focus": <Target size={18} color={c.accent} />,
    "routines-today": <Repeat size={18} color={c.text3} />,
    "done-today": <Sunset size={18} color={c.accent} />,
    closeable: <Flag size={18} color={c.accent} />,
    sleeping: <Moon size={18} color={c.text3} />,
    "stale-ideas": <Lightbulb size={18} color={c.text3} />,
    "active-projects": <Zap size={18} color={c.accent} />,
    "launched-with-tasks": <Rocket size={18} color={c.closed} />,
  };

  const labels = {
    show: t("views.today.customize.show"),
    hide: t("views.today.customize.hide"),
    locked: t("views.today.customize.alwaysVisible"),
    drag: t("views.today.customize.dragToReorder"),
  };

  // Orden actual del usuario; descarta ids huérfanos (secciones retiradas).
  const rows: TodaySectionMeta[] = layout.order
    .map((id) => TODAY_SECTIONS.find((s) => s.id === id))
    .filter((s): s is TodaySectionMeta => Boolean(s));

  const renderItem = ({ item, drag, isActive }: RenderItemParams<TodaySectionMeta>) => (
    <View className="mb-2">
      <TodaySectionEditRow
        icon={ICON[item.id]}
        label={t(`views.today.sections.${item.labelKey}`)}
        hidden={layout.hidden.has(item.id)}
        hideable={item.hideable}
        isActive={isActive}
        onToggleHide={() => layout.toggleVisibility(item.id)}
        onLongPressDrag={drag}
        labels={labels}
      />
    </View>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-bg">
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <TodayCustomizeBar
          onExit={onExit}
          onReset={layout.reset}
          labels={{
            title: t("views.today.customize.title"),
            close: t("views.today.customize.close"),
            reset: t("views.today.customize.reset"),
            done: t("views.today.customize.done"),
          }}
        />
        <DraggableFlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => layout.setOrderDirect(data.map((it) => it.id))}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
