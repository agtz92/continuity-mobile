import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListSkeleton } from "@/components/ui/Skeletons";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { DayGrid } from "@/components/calendar/DayGrid";
import { MonthView } from "@/components/calendar/MonthView";
import { itemsMeta, periodLabel } from "@/components/calendar/labels";
import { WeekAgenda } from "@/components/calendar/WeekAgenda";
import { projectColor, type CalendarHandlers } from "@/components/calendar/parts";
import { formatHours } from "@/components/calendar/summary";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { addDaysISO, isSameMonth, type CalendarView } from "@/lib/calendar";
import { todayLocalISODate, toLocalISO } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Calendario: cabecera fija (periodo, flechas, vista) y debajo Día, Semana o Mes. */
export default function Calendar() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const todayISO = todayLocalISODate();

  const [view, setView] = useState<CalendarView>("week");
  const [refISO, setRefISO] = useState(todayISO);
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [showTasks, setShowTasks] = useState(true);
  const [showLoad, setShowLoad] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Un solo intervalo para la línea "ahora", no uno por bloque.
  const [nowMinutes, setNowMinutes] = useState(minutesNow);
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(minutesNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  // El día que se ve en detalle: el de la vista Día o el seleccionado en el Mes.
  const focusISO = view === "month" ? selectedISO : refISO;
  const {
    projects,
    categoryById,
    initialLoading,
    refetch,
    locale,
    refDate,
    days,
    weeks,
    projectsById,
    tByDay,
    rByDay,
    summary,
    barsByDay,
    levelByDay,
    overloaded,
    focus,
    focusLoad,
  } = useCalendarData({ view, refISO, focusISO, showTasks });
  const { toggleTask } = useTaskMutations();

  const goToday = useCallback(() => {
    setRefISO(todayISO);
    setSelectedISO(todayISO);
  }, [todayISO]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={goToday}
          accessibilityRole="button"
          className="justify-center active:opacity-60"
          style={{ minHeight: SIZE.hit, paddingHorizontal: 8 }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.accent }}>
            {t("views.calendar.today")}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, t, c.accent, goToday]);

  const dayName = new Date(focusISO + "T00:00:00").toLocaleDateString(locale, { weekday: "long" });

  const handlers: CalendarHandlers = useMemo(
    () => ({
      onOpenProject: (id) => router.push({ pathname: "/project/[id]", params: { id } }),
      onOpenTask: (id) => router.push({ pathname: "/task-form", params: { id } }),
      onToggleTask: async (task) => {
        const wasDone = task.done;
        await toggleTask(task);
        if (!wasDone) confirmCompleted(t("taskRow.completedToast"));
      },
      // Las rutinas no se completan desde el calendario: tocar abre su edición.
      onOpenRoutine: (id) => router.push({ pathname: "/routine-form", params: { id } }),
    }),
    [router, toggleTask, t],
  );

  const openDay = useCallback((iso: string) => {
    setRefISO(iso);
    setView("day");
  }, []);
  // Primer toque selecciona; tocar el seleccionado entra al día. Lee la
  // selección por ref para que el callback sea estable y las celdas memo no
  // se vuelvan a pintar todas al cambiarla.
  const selectedRef = useRef(selectedISO);
  selectedRef.current = selectedISO;
  const onPickDay = useCallback(
    (iso: string) => (iso === selectedRef.current ? openDay(iso) : setSelectedISO(iso)),
    [openDay],
  );

  const shift = (dir: number) => {
    if (view === "day") setRefISO(addDaysISO(refISO, dir));
    else if (view === "week") setRefISO(addDaysISO(refISO, dir * 7));
    else {
      const d = new Date(refDate);
      d.setMonth(d.getMonth() + dir);
      setRefISO(toLocalISO(d));
      setSelectedISO(isSameMonth(todayISO, d) ? todayISO : toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1)));
    }
  };

  const period = periodLabel(view, refDate, days, locale);
  const counts = [
    t("views.calendar.tasksCount", { count: summary.tasks }),
    t("views.calendar.routinesCount", { count: summary.routines }),
  ].join(" · ");
  const meta =
    view === "day" ? (
      itemsMeta(t, focus.agenda.length, focusLoad.hours, true)
    ) : view === "month" ? (
      <>
        {counts}
        {showLoad && overloaded > 0 ? (
          <Text style={{ color: c.signal }}>{` · ${t("views.calendar.overloadedDays", { count: overloaded })}`}</Text>
        ) : null}
      </>
    ) : (
      [counts, summary.hours > 0 ? formatHours(summary.hours) : null].filter(Boolean).join(" · ")
    );

  if (initialLoading) {
    return (
      <View className="flex-1 bg-bg pt-4">
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <CalendarHeader
        period={period}
        meta={meta}
        view={view}
        onChangeView={setView}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onOpenFilters={() => setFiltersOpen(true)}
        filtersActive={!showTasks || !showLoad}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 12, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await refetch();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={c.accent}
          />
        }
      >
        {view === "week" ? (
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
            emptyLabel={t("views.calendar.nothingScheduled")}
          />
        ) : view === "month" ? (
          <MonthView
            weeks={weeks}
            refDate={refDate}
            todayISO={todayISO}
            selectedISO={selectedISO}
            locale={locale}
            barsByDay={barsByDay}
            levelByDay={showLoad ? levelByDay : null}
            sampleBar={projectColor(projects.find((p) => p.categoryId) ?? null, categoryById, c)}
            agenda={focus.agenda}
            agendaMeta={focus.agenda.length > 0 ? itemsMeta(t, focus.agenda.length, focusLoad.hours, false) : ""}
            colors={c}
            handlers={handlers}
            onPickDay={onPickDay}
            onOpenDay={() => openDay(selectedISO)}
          />
        ) : (
          <DayGrid
            allDay={focus.allDay}
            timed={focus.timed}
            isToday={refISO === todayISO}
            nowMinutes={nowMinutes}
            dayName={dayName}
            load={focusLoad}
            showLoad={showLoad}
            locale={locale}
            colors={c}
            handlers={handlers}
            onAdd={() => router.push({ pathname: "/task-form", params: { due: refISO } })}
          />
        )}
      </ScrollView>

      <CalendarFilters
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        showTasks={showTasks}
        onToggleTasks={() => setShowTasks((v) => !v)}
        showLoad={showLoad}
        onToggleLoad={() => setShowLoad((v) => !v)}
      />
    </View>
  );
}
