import { useMemo, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListChecks,
} from "lucide-react-native";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { todayLocalISODate, toLocalISO } from "@/lib/date";
import {
  addDaysISO,
  dayLoad,
  isSameMonth,
  monthMatrix,
  routineItemsByDay,
  tasksByDay,
  weekDays,
  type CalendarView,
} from "@/lib/calendar";
import { confirmCompleted } from "@/lib/feedback";
import { isDailyViewStatus } from "@/lib/projectStatus";
import type { CalendarHandlers } from "@/components/calendar/parts";
import { WeekAgenda } from "@/components/calendar/WeekAgenda";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { DayGrid } from "@/components/calendar/DayGrid";
import { SelectedDayAgenda } from "@/components/calendar/SelectedDayAgenda";

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const locale = i18n.language || "en";
  const todayISO = todayLocalISODate();

  const { projects, tasks, routines, routineOccurrences, categoryById, refetch } =
    useDashboardData();
  const { toggleTask } = useTaskMutations();
  const { completeOccurrence, uncompleteOccurrence } = useRoutineMutations();

  const [view, setView] = useState<CalendarView>("week");
  const [refISO, setRefISO] = useState(todayISO);
  // Day highlighted in the Month grid; its agenda renders under the matrix.
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [showTasks, setShowTasks] = useState(false);
  const [showLoad, setShowLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const refDate = useMemo(() => new Date(refISO + "T00:00:00"), [refISO]);

  const { fromISO, toISO, days, weeks } = useMemo(() => {
    if (view === "day") {
      return { fromISO: refISO, toISO: refISO, days: [refISO], weeks: [] as string[][] };
    }
    if (view === "week") {
      const d = weekDays(refDate);
      return { fromISO: d[0], toISO: d[6], days: d, weeks: [] as string[][] };
    }
    const w = monthMatrix(refDate);
    return { fromISO: w[0][0], toISO: w[w.length - 1][6], days: [] as string[], weeks: w };
  }, [view, refISO, refDate]);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  // Mirror Today/Tasks: tasks of a closed project (paused/stalled/killed/
  // archived) are withdrawn from the calendar; standalone tasks and tasks of a
  // live project stay. Keeps the calendar in sync with the other task views.
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.projectId) return true;
        const parent = projectsById.get(task.projectId);
        return parent ? isDailyViewStatus(parent.status) : true;
      }),
    [tasks, projectsById]
  );

  const tByDay = useMemo(
    () => tasksByDay(visibleTasks, fromISO, toISO),
    [visibleTasks, fromISO, toISO]
  );
  const rByDay = useMemo(
    () => routineItemsByDay(routines, routineOccurrences, fromISO, toISO),
    [routines, routineOccurrences, fromISO, toISO]
  );

  const handlers: CalendarHandlers = {
    onOpenProject: (id) => router.push({ pathname: "/project/[id]", params: { id } }),
    onOpenTask: (id) => router.push({ pathname: "/task-form", params: { id } }),
    onToggleTask: async (task) => {
      const wasDone = task.done;
      await toggleTask(task);
      if (!wasDone) confirmCompleted(t("taskRow.completedToast"));
    },
    onCompleteOccurrence: async (routineId, scheduledDate) => {
      await completeOccurrence(routineId, scheduledDate);
      confirmCompleted(t("routineRow.completedToast"));
    },
    onUncompleteOccurrence: (occurrenceId) => uncompleteOccurrence(occurrenceId),
  };

  const shift = (dir: number) => {
    if (view === "day") setRefISO(addDaysISO(refISO, dir));
    else if (view === "week") setRefISO(addDaysISO(refISO, dir * 7));
    else {
      const d = new Date(refDate);
      d.setMonth(d.getMonth() + dir);
      setRefISO(toLocalISO(d));
      // Keep the month selection meaningful: today when visible, else the 1st.
      setSelectedISO(
        isSameMonth(todayISO, d)
          ? todayISO
          : toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1))
      );
    }
  };

  const goToday = () => {
    setRefISO(todayISO);
    setSelectedISO(todayISO);
  };

  const periodLabel = useMemo(() => {
    if (view === "day") {
      return refDate.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    if (view === "week") {
      const a = new Date(days[0] + "T00:00:00");
      const b = new Date(days[6] + "T00:00:00");
      const fmt = (d: Date) =>
        d.toLocaleDateString(locale, { day: "numeric", month: "short" });
      return `${fmt(a)} – ${fmt(b)}`;
    }
    return refDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [view, refDate, days, locale]);

  const hasAny = tByDay.size > 0 || rByDay.size > 0;

  const seg = (mode: CalendarView, label: string) => (
    <Pressable
      key={mode}
      onPress={() => setView(mode)}
      className="px-3 py-1.5"
      style={{ backgroundColor: view === mode ? c.accent : "transparent" }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: view === mode ? c.bg : c.textMuted }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const toggle = (
    active: boolean,
    onPress: () => void,
    icon: ReactNode,
    label: string
  ) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 rounded-full border px-2.5 py-1.5"
      style={{
        backgroundColor: active ? alpha(c.accent, 0.16) : c.surface,
        borderColor: active ? alpha(c.accent, 0.35) : c.border,
      }}
    >
      {icon}
      <Text className="text-xs" style={{ color: active ? c.accent : c.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-bg">
      <View className="gap-2 px-4 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <View
            className="flex-row overflow-hidden rounded-lg border"
            style={{ borderColor: c.border }}
          >
            {seg("day", t("views.calendar.viewDay"))}
            {seg("week", t("views.calendar.viewWeek"))}
            {seg("month", t("views.calendar.viewMonth"))}
          </View>
          <View className="flex-row items-center gap-1.5">
            {toggle(
              showTasks,
              () => setShowTasks((v) => !v),
              <ListChecks size={13} color={showTasks ? c.accent : c.textMuted} />,
              t("views.calendar.showTasks")
            )}
            {toggle(
              showLoad,
              () => setShowLoad((v) => !v),
              <Gauge size={13} color={showLoad ? c.accent : c.textMuted} />,
              t("views.calendar.load")
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => shift(-1)}
            hitSlop={6}
            className="rounded-md border p-1.5"
            style={{ borderColor: c.border }}
          >
            <ChevronLeft size={16} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => shift(1)}
            hitSlop={6}
            className="rounded-md border p-1.5"
            style={{ borderColor: c.border }}
          >
            <ChevronRight size={16} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={goToday}
            className="rounded-md border px-3 py-1.5"
            style={{ borderColor: c.border }}
          >
            <Text className="text-xs" style={{ color: c.textMuted }}>
              {t("views.calendar.today")}
            </Text>
          </Pressable>
          <Text
            className="flex-1 text-sm font-medium capitalize"
            style={{ color: c.text }}
            numberOfLines={1}
          >
            {periodLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
          />
        }
      >
        {!hasAny ? (
          <View
            className="items-center rounded-xl border py-12"
            style={{ borderColor: c.border, backgroundColor: c.surface }}
          >
            <Text className="text-sm italic" style={{ color: c.textMuted }}>
              {t("views.calendar.empty")}
            </Text>
          </View>
        ) : view === "week" ? (
          <WeekAgenda
            days={days}
            todayISO={todayISO}
            locale={locale}
            tasksByDay={tByDay}
            routinesByDay={rByDay}
            projectsById={projectsById}
            categoryById={categoryById}
            showTasks={showTasks}
            showLoad={showLoad}
            colors={c}
            handlers={handlers}
            emptyLabel={t("views.calendar.dash")}
          />
        ) : view === "month" ? (
          <View>
            <MonthGrid
              weeks={weeks}
              refDate={refDate}
              todayISO={todayISO}
              selectedISO={selectedISO}
              weekdayLabels={(weeks[0] ?? []).map((iso) =>
                new Date(iso + "T00:00:00").toLocaleDateString(locale, {
                  weekday: "short",
                })
              )}
              tasksByDay={tByDay}
              routinesByDay={rByDay}
              projectsById={projectsById}
              categoryById={categoryById}
              showTasks={showTasks}
              showLoad={showLoad}
              colors={c}
              onPickDay={(iso) => {
                // First tap selects; tapping the selected day drills in.
                if (iso === selectedISO) {
                  setRefISO(iso);
                  setView("day");
                } else {
                  setSelectedISO(iso);
                }
              }}
            />
            <SelectedDayAgenda
              iso={selectedISO}
              locale={locale}
              dayTasks={tByDay.get(selectedISO) ?? []}
              dayRoutines={rByDay.get(selectedISO) ?? []}
              projectsById={projectsById}
              categoryById={categoryById}
              showTasks={showTasks}
              colors={c}
              handlers={handlers}
              openDayLabel={t("views.calendar.openDay")}
              activitiesLabel={(count) =>
                t("views.calendar.activities", { count })
              }
              emptyLabel={t("views.calendar.empty")}
              onOpenDay={(iso) => {
                setRefISO(iso);
                setView("day");
              }}
            />
          </View>
        ) : (
          <DayGrid
            iso={refISO}
            todayISO={todayISO}
            locale={locale}
            dayTasks={tByDay.get(refISO) ?? []}
            dayRoutines={rByDay.get(refISO) ?? []}
            load={dayLoad(tByDay.get(refISO) ?? [], rByDay.get(refISO) ?? [])}
            projectsById={projectsById}
            categoryById={categoryById}
            showTasks={showTasks}
            showLoad={showLoad}
            colors={c}
            handlers={handlers}
            allDayLabel={t("views.calendar.allDay")}
            withTimeLabel={t("views.calendar.withTime")}
            moreLabel={(count) => t("views.calendar.allDayMore", { count })}
            lessLabel={t("views.calendar.allDayLess")}
            nowLabel={t("views.calendar.now")}
            emptyLabel={t("views.calendar.dash")}
          />
        )}
      </ScrollView>
    </View>
  );
}
