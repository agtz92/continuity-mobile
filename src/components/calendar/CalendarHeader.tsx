import { memo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react-native";

import { IconAction } from "@/components/ui/IconAction";
import { Segmented } from "@/components/ui/Segmented";
import type { CalendarView } from "@/lib/calendar";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/** Caja de 44 con filete: flechas de periodo y botón de filtros. */
function Boxed({ children }: { children: ReactNode }) {
  const c = useThemeColors();
  return (
    <View
      style={{ borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}
    >
      {children}
    </View>
  );
}

/**
 * Cabecera compartida por Día, Semana y Mes: periodo en display 26/30, meta en
 * versalitas, flechas de 44 y el selector de vista con el botón de filtros.
 * Vive fuera del scroll: cambiar de periodo no la remonta y queda fija arriba.
 */
export const CalendarHeader = memo(function CalendarHeader({
  period,
  meta,
  view,
  onChangeView,
  onPrev,
  onNext,
  onOpenFilters,
  filtersActive,
}: {
  period: string;
  meta: ReactNode;
  view: CalendarView;
  onChangeView: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenFilters: () => void;
  /** Algún filtro distinto del predeterminado: el icono se pinta en accent. */
  filtersActive: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <View
      style={{
        paddingTop: 16,
        paddingHorizontal: SIZE.gutter,
        paddingBottom: 12,
        gap: 14,
        backgroundColor: c.bg,
        borderBottomWidth: 1,
        borderBottomColor: c.line[8],
      }}
    >
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="min-w-0 flex-1" style={{ gap: 4 }}>
          <Text
            accessibilityRole="header"
            className="font-display"
            style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.9, color: c.text }}
          >
            {period}
          </Text>
          <Text
            className="font-sans-semibold uppercase"
            style={{ fontSize: 12, letterSpacing: 0.8, color: c.text2 }}
          >
            {meta}
          </Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <Boxed>
            <IconAction icon={ChevronLeft} tone="text" label={t("views.calendar.previous")} onPress={onPrev} />
          </Boxed>
          <Boxed>
            <IconAction icon={ChevronRight} tone="text" label={t("views.calendar.next")} onPress={onNext} />
          </Boxed>
        </View>
      </View>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View className="flex-1">
          <Segmented
            options={[
              { value: "day", label: t("views.calendar.viewDay") },
              { value: "week", label: t("views.calendar.viewWeek") },
              { value: "month", label: t("views.calendar.viewMonth") },
            ]}
            value={view}
            onChange={onChangeView}
          />
        </View>
        <Boxed>
          <IconAction
            icon={SlidersHorizontal}
            tone={filtersActive ? "accent" : "text"}
            label={t("views.calendar.filters")}
            onPress={onOpenFilters}
          />
        </Boxed>
      </View>
    </View>
  );
});
