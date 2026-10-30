import { View } from "react-native";
import { useTranslation } from "react-i18next";

import type { LoadLevel } from "@/lib/calendar";
import type { ThemeColors } from "@/theme/useThemeColors";
import type { CalendarEntry } from "./CalendarItemRow";
import { DayAgenda } from "./DayAgenda";
import { MonthGrid } from "./MonthGrid";
import { MonthLegend } from "./MonthLegend";
import type { CalendarHandlers } from "./parts";

const date = (iso: string) => new Date(iso + "T00:00:00");

/** Vista Mes: matriz, leyenda y la agenda del día seleccionado debajo. */
export function MonthView({
  weeks,
  refDate,
  todayISO,
  selectedISO,
  locale,
  barsByDay,
  levelByDay,
  sampleBar,
  agenda,
  agendaMeta,
  colors: c,
  handlers,
  onPickDay,
  onOpenDay,
}: {
  weeks: string[][];
  refDate: Date;
  todayISO: string;
  selectedISO: string;
  locale: string;
  barsByDay: Map<string, string[]>;
  /** `null` con la carga apagada. */
  levelByDay: Map<string, LoadLevel> | null;
  sampleBar: string;
  agenda: CalendarEntry[];
  agendaMeta: string;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  onPickDay: (iso: string) => void;
  onOpenDay: () => void;
}) {
  const { t } = useTranslation();
  const selected = date(selectedISO);
  return (
    <View>
      <MonthGrid
        weeks={weeks}
        refDate={refDate}
        todayISO={todayISO}
        selectedISO={selectedISO}
        weekdayLetters={(weeks[0] ?? []).map((iso) => date(iso).toLocaleDateString(locale, { weekday: "narrow" }))}
        barsByDay={barsByDay}
        levelByDay={levelByDay}
        dayLabel={(iso) =>
          `${date(iso).toLocaleDateString(locale, { weekday: "long", day: "numeric" })}, ${t(
            "views.calendar.itemsCount",
            { count: barsByDay.get(iso)?.length ?? 0 },
          )}`
        }
        colors={c}
        onPickDay={onPickDay}
      />
      <MonthLegend showLoad={levelByDay != null} sampleBar={sampleBar} colors={c} />
      <DayAgenda
        title={selected.toLocaleDateString(locale, { weekday: "long", day: "numeric" })}
        meta={agendaMeta}
        entries={agenda}
        colors={c}
        handlers={handlers}
        emptyLabel={t("views.calendar.nothingOn", {
          day: selected.toLocaleDateString(locale, { weekday: "long" }),
        })}
        onOpenDay={onOpenDay}
      />
    </View>
  );
}
