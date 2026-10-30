import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react-native";

import type { ThemeColors } from "@/theme/useThemeColors";
import { CalendarItemRow, type CalendarEntry } from "./CalendarItemRow";
import type { CalendarHandlers } from "./parts";

const MAX_ITEMS = 4;

/**
 * Agenda del día seleccionado bajo la matriz del Mes. Sin tarjeta: regla de
 * 3 px en `accent`, cabecera con el día y "Open day →", y hasta 4 filas (las
 * mismas del all-day del Día); el resto abre la vista Día.
 */
export function DayAgenda({
  title,
  meta,
  entries,
  colors: c,
  handlers,
  emptyLabel,
  onOpenDay,
}: {
  title: string;
  meta: string;
  entries: CalendarEntry[];
  colors: ThemeColors;
  handlers: CalendarHandlers;
  emptyLabel: string;
  onOpenDay: () => void;
}) {
  const { t } = useTranslation();
  const shown = entries.slice(0, MAX_ITEMS);
  const hidden = entries.length - shown.length;
  return (
    <View style={{ marginTop: 12, borderTopWidth: 3, borderTopColor: c.accent, paddingTop: 4 }}>
      <View className="flex-row items-center" style={{ minHeight: 48, gap: 12 }}>
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="font-display"
            style={{ fontSize: 20, lineHeight: 24, color: c.text }}
          >
            {title}
          </Text>
          {meta ? (
            <Text
              className="font-sans-semibold uppercase"
              style={{ fontSize: 12, letterSpacing: 0.6, color: c.text3 }}
            >
              {meta}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onOpenDay}
          accessibilityRole="button"
          className="flex-row items-center active:opacity-60"
          style={{ minHeight: 44, gap: 6 }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.accent }}>
            {t("views.calendar.openDay")}
          </Text>
          <ArrowRight size={16} color={c.accent} />
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <Text className="font-sans" style={{ fontSize: 15, color: c.text3, paddingVertical: 12 }}>
          {emptyLabel}
        </Text>
      ) : (
        <View>
          {shown.map((e, i) => (
            <CalendarItemRow key={e.key} entry={e} handlers={handlers} last={i === shown.length - 1 && hidden === 0} />
          ))}
          {hidden > 0 ? (
            <Pressable
              onPress={onOpenDay}
              accessibilityRole="button"
              className="justify-center active:opacity-60"
              style={{ minHeight: 44 }}
            >
              <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
                {t("views.calendar.moreCount", { count: hidden })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
