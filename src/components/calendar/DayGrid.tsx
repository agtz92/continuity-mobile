import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { hoursRange, layoutOverlaps, type DayLoad } from "@/lib/calendar";
import type { ThemeColors } from "@/theme/useThemeColors";
import { CalendarItemRow, type CalendarEntry } from "./CalendarItemRow";
import { NowLine } from "./NowLine";
import { HOUR_PX, TimedBlock } from "./TimedBlock";
import { AddToDayButton, CalendarCintillo, DayLoadBar, type CalendarHandlers } from "./parts";
import { clock, type TimedEntry } from "./entries";

const GUTTER = 52;
/** Más de esto en "All day": se ven 5 y una fila "+N more". */
const ALL_DAY_MAX = 6;

/** Vista Día: carga, ítems sin hora como filas, cuadrícula horaria y "Add to …". */
export function DayGrid({
  allDay,
  timed,
  isToday,
  nowMinutes,
  dayName,
  load,
  showLoad,
  locale,
  colors: c,
  handlers,
  onAdd,
}: {
  allDay: CalendarEntry[];
  timed: TimedEntry[];
  isToday: boolean;
  nowMinutes: number;
  /** "Thursday": nombre del día para "Add to Thursday". */
  dayName: string;
  load: DayLoad;
  showLoad: boolean;
  locale: string;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const [startHour, endHour] = hoursRange(timed.map((b) => b.start));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const topFor = (min: number) => (min / 60 - startHour) * HOUR_PX;
  const cols = layoutOverlaps(timed.map((b) => ({ key: b.key, start: b.start, end: b.start + b.minutes })));
  const showNow = isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  const collapsed = allDay.length > ALL_DAY_MAX && !expanded;
  const visible = collapsed ? allDay.slice(0, 5) : allDay;

  const openTimed = (b: TimedEntry) => {
    if (b.task) handlers.onOpenTask(b.task.id);
    else if (b.routineId) handlers.onOpenRoutine(b.routineId);
  };

  const addButton = <AddToDayButton label={t("views.calendar.addTo", { day: dayName })} colors={c} onPress={onAdd} />;

  if (allDay.length === 0 && timed.length === 0) {
    return (
      <View style={{ borderTopWidth: 3, borderTopColor: c.accent, paddingTop: 14, gap: 16 }}>
        <Text className="font-display" style={{ fontSize: 20, lineHeight: 24, color: c.text }}>
          {t("views.calendar.nothingOn", { day: dayName })}
        </Text>
        {addButton}
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {showLoad ? (
        <DayLoadBar load={load} colors={c} label={t(`views.calendar.loadLevel.${load.level}`)} />
      ) : null}

      {allDay.length > 0 ? (
        <View>
          <CalendarCintillo label={t("views.calendar.allDay")} count={allDay.length} colors={c} />
          {visible.map((e, i) => (
            <CalendarItemRow key={e.key} entry={e} handlers={handlers} last={!collapsed && i === visible.length - 1} />
          ))}
          {collapsed ? (
            <Pressable
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              className="justify-center active:opacity-60"
              style={{ minHeight: 44 }}
            >
              <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
                {t("views.calendar.moreCount", { count: allDay.length - 5 })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {timed.length > 0 ? (
        <View style={{ marginTop: allDay.length > 0 ? 16 : 0 }}>
          <CalendarCintillo label={t("views.calendar.withTime")} count={timed.length} colors={c} />
          <View style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <View
                key={h}
                className="flex-row"
                style={{ height: HOUR_PX, borderTopWidth: 1, borderTopColor: i === 0 ? c.line[22] : c.line[10] }}
              >
                <View style={{ width: GUTTER, borderRightWidth: 1, borderRightColor: c.line[14], paddingTop: 4 }}>
                  <Text
                    className="font-sans-semibold uppercase"
                    style={{ fontSize: 12, letterSpacing: 0.6, color: c.text3, fontVariant: ["tabular-nums"] }}
                  >
                    {new Date(2000, 0, 1, h).toLocaleTimeString(locale, { hour: "numeric" })}
                  </Text>
                </View>
              </View>
            ))}
            {/* Un solo View absoluto para todos los bloques. */}
            <View style={{ position: "absolute", left: GUTTER, right: 0, top: 0, bottom: 0 }}>
              {timed.map((b) => {
                const pos = cols.get(b.key) ?? { col: 0, cols: 1 };
                return (
                  <TimedBlock
                    key={b.key}
                    entry={b}
                    top={topFor(b.start) + 2}
                    left={`${(pos.col / pos.cols) * 100}%`}
                    width={`${100 / pos.cols}%`}
                    colors={c}
                    onPress={openTimed}
                  />
                );
              })}
            </View>
            {showNow ? (
              <NowLine
                top={topFor(nowMinutes)}
                gutter={GUTTER}
                label={`${t("views.calendar.now")} ${clock(nowMinutes, locale)}`}
                colors={c}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>{addButton}</View>
    </View>
  );
}
