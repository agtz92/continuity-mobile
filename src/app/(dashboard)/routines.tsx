import { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Archive,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  Search,
  Target,
} from "lucide-react-native";
import type { Routine } from "@/lib/types";
import { todayLocalISODate, toLocalISO } from "@/lib/date";
import { completedDatesFor, computeDueDates } from "@/lib/recurrence";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FAB } from "@/components/ui/FAB";
import { RoutineRow } from "@/components/routines/RoutineRow";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const HORIZON_DAYS = 7; // how far ahead we materialize pending occurrences for "Upcoming"
const BACKLOG_DAYS = 14; // how far back we surface missed pending occurrences
const LATER_LOOKAHEAD = 365; // one row per routine whose next date is beyond the horizon

const ORANGE = "249,115,22";
const ORANGE_T = "rgb(251,146,60)";

interface DueItem {
  routine: Routine;
  scheduledDate: string;
  occurrenceId: string | null;
}

export default function Routines() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { routines, routineOccurrences, projects, categoryById, initialLoading, refetch } =
    useDashboardData();
  const {
    archiveRoutine,
    deleteRoutine,
    completeOccurrence,
    uncompleteOccurrence,
  } = useRoutineMutations();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showLater, setShowLater] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const resolveRoutineProject = (r: Routine) => {
    if (!r.projectId) return undefined;
    const proj = projects.find((p) => p.id === r.projectId);
    if (!proj) return undefined;
    const cat = proj.categoryId ? categoryById[proj.categoryId] : undefined;
    return { name: proj.name, color: cat?.color ?? "emerald" };
  };

  const today = todayLocalISODate();
  const horizonDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + HORIZON_DAYS);
    return toLocalISO(d);
  }, []);
  const backlogStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - BACKLOG_DAYS);
    return toLocalISO(d);
  }, []);
  const laterHorizonDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + LATER_LOOKAHEAD);
    return toLocalISO(d);
  }, []);
  const dayAfterHorizon = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + HORIZON_DAYS + 1);
    return toLocalISO(d);
  }, []);

  const {
    todayBucket,
    upcomingBucket,
    laterBucket,
    completedTodayBucket,
    archivedRoutines,
  } = useMemo(() => {
    const active = routines.filter((r) => !r.archived);
    const archived = routines.filter((r) => r.archived);
    const routineById = new Map(routines.map((r) => [r.id, r]));
    const occByRoutine = new Map<string, Set<string>>();
    for (const r of active) {
      occByRoutine.set(r.id, completedDatesFor(routineOccurrences, r.id));
    }
    const todayItems: DueItem[] = [];
    const upcomingItems: DueItem[] = [];
    const laterItems: DueItem[] = [];
    const seenInUpcoming = new Set<string>();
    // Primary pass: Today & Upcoming within HORIZON_DAYS.
    for (const r of active) {
      const done = occByRoutine.get(r.id) ?? new Set<string>();
      const dates = computeDueDates(r, backlogStart, horizonDate);
      for (const d of dates) {
        if (done.has(d)) continue;
        if (d <= today) {
          todayItems.push({ routine: r, scheduledDate: d, occurrenceId: null });
        } else {
          upcomingItems.push({ routine: r, scheduledDate: d, occurrenceId: null });
        }
        seenInUpcoming.add(r.id);
      }
    }
    // Later pass: one entry per routine — the next pending occurrence beyond the
    // upcoming horizon. Skip routines already visible above.
    for (const r of active) {
      if (seenInUpcoming.has(r.id)) continue;
      const done = occByRoutine.get(r.id) ?? new Set<string>();
      const futureDates = computeDueDates(r, dayAfterHorizon, laterHorizonDate);
      const next = futureDates.find((d) => !done.has(d));
      if (next) {
        laterItems.push({ routine: r, scheduledDate: next, occurrenceId: null });
      }
    }
    // Occurrences completed today — surfaced so an accidental completion can be
    // undone (toggling the checkbox calls uncompleteOccurrence).
    const completedTodayItems: DueItem[] = [];
    for (const occ of routineOccurrences) {
      if (toLocalISO(new Date(occ.completedAt)) !== today) continue;
      const r = routineById.get(occ.routineId);
      if (!r) continue;
      completedTodayItems.push({
        routine: r,
        scheduledDate: occ.scheduledDate,
        occurrenceId: occ.id,
      });
    }
    todayItems.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    upcomingItems.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    laterItems.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    completedTodayItems.sort((a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate)
    );
    return {
      todayBucket: todayItems,
      upcomingBucket: upcomingItems,
      laterBucket: laterItems,
      completedTodayBucket: completedTodayItems,
      archivedRoutines: archived,
    };
  }, [
    routines,
    routineOccurrences,
    today,
    horizonDate,
    backlogStart,
    dayAfterHorizon,
    laterHorizonDate,
  ]);

  const q = search.trim().toLowerCase();
  const filterByQuery = <T extends { routine: Routine }>(items: T[]): T[] =>
    q ? items.filter((i) => i.routine.title.toLowerCase().includes(q)) : items;
  const filterRoutinesByQuery = (rs: Routine[]): Routine[] =>
    q ? rs.filter((r) => r.title.toLowerCase().includes(q)) : rs;

  const filteredToday = filterByQuery(todayBucket);
  const filteredCompleted = filterByQuery(completedTodayBucket);
  const filteredUpcoming = filterByQuery(upcomingBucket);
  const filteredLater = filterByQuery(laterBucket);
  const filteredArchived = filterRoutinesByQuery(archivedRoutines);

  const searching = q.length > 0;
  const todayOpen = searching || showToday;
  const completedOpen = searching || showCompleted;
  const upcomingOpen = searching || showUpcoming;
  const laterOpen = searching || showLater;
  const archivedOpen = searching || showArchived;

  const onArchive = (r: Routine) => archiveRoutine(r.id, !r.archived);
  const onEdit = (r: Routine) =>
    router.push({ pathname: "/routine-form", params: { id: r.id } });

  const renderRow = (
    it: DueItem,
    opts?: { withArchive?: boolean; withDelete?: boolean }
  ) => (
    <RoutineRow
      key={`${it.routine.id}-${it.scheduledDate}`}
      routine={it.routine}
      scheduledDate={it.scheduledDate}
      occurrenceId={it.occurrenceId}
      project={resolveRoutineProject(it.routine)}
      onComplete={completeOccurrence}
      onUncomplete={uncompleteOccurrence}
      onEdit={onEdit}
      onArchive={opts?.withArchive ? onArchive : undefined}
      onDelete={opts?.withDelete ? deleteRoutine : undefined}
    />
  );

  const pill = (n: number, bg: string, border: string, color: string) => (
    <View
      className="rounded-full border px-2 py-0.5"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <Text className="text-xs" style={{ color }}>
        {n}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.routines.title")}
        </Text>

        {routines.length > 0 && (
          <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search size={16} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("views.routines.search")}
              placeholderTextColor={c.textMuted}
              className="flex-1 py-2.5"
              style={{ color: c.text }}
            />
          </View>
        )}
      </View>

      {initialLoading && routines.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-text-muted">…</Text>
        </View>
      ) : routines.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.routines.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          <CollapsibleSection
            variant="card"
            open={todayOpen}
            onToggle={() => setShowToday((s) => !s)}
            icon={<Target size={14} color={ORANGE_T} />}
            title={t("views.routines.todayBucket")}
            rightSlot={pill(
              filteredToday.length,
              `rgba(${ORANGE},0.1)`,
              `rgba(${ORANGE},0.3)`,
              ORANGE_T
            )}
          >
            {filteredToday.length === 0 ? (
              <Text className="py-4 text-center text-sm text-text-muted">
                {t("views.routines.todayEmpty")}
              </Text>
            ) : (
              <View className="gap-2">
                {filteredToday.map((it) =>
                  renderRow(it, { withArchive: true, withDelete: true })
                )}
              </View>
            )}
          </CollapsibleSection>

          {filteredCompleted.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={completedOpen}
              onToggle={() => setShowCompleted((s) => !s)}
              icon={<CheckCircle2 size={14} color={c.accent} />}
              title={t("views.routines.completedToday")}
              rightSlot={pill(
                filteredCompleted.length,
                alpha(c.accent, 0.1),
                alpha(c.accent, 0.3),
                c.accent
              )}
            >
              <View className="gap-2">
                {filteredCompleted.map((it) => renderRow(it))}
              </View>
            </CollapsibleSection>
          )}

          {filteredUpcoming.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={upcomingOpen}
              onToggle={() => setShowUpcoming((s) => !s)}
              icon={<Clock size={14} color={c.accent2} />}
              title={t("views.routines.upcoming")}
              rightSlot={pill(
                filteredUpcoming.length,
                alpha(c.accent2, 0.1),
                alpha(c.accent2, 0.3),
                c.accent2
              )}
            >
              <View className="gap-2">
                {filteredUpcoming.map((it) => renderRow(it, { withArchive: true }))}
              </View>
            </CollapsibleSection>
          )}

          {filteredLater.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={laterOpen}
              onToggle={() => setShowLater((s) => !s)}
              icon={<Hourglass size={14} color={c.textMuted} />}
              title={t("views.routines.later")}
              rightSlot={pill(
                filteredLater.length,
                alpha(c.border, 0.5),
                c.border,
                c.textMuted
              )}
            >
              <View className="gap-2">
                {filteredLater.map((it) => renderRow(it, { withArchive: true }))}
              </View>
            </CollapsibleSection>
          )}

          {filteredArchived.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={archivedOpen}
              onToggle={() => setShowArchived((s) => !s)}
              icon={<Archive size={14} color={c.textMuted} />}
              title={t("views.routines.archived")}
              rightSlot={pill(
                filteredArchived.length,
                alpha(c.border, 0.5),
                c.border,
                c.textMuted
              )}
            >
              <View className="gap-2">
                {filteredArchived.map((r) => (
                  <RoutineRow
                    key={r.id}
                    routine={r}
                    scheduledDate={r.startDate}
                    occurrenceId={null}
                    project={resolveRoutineProject(r)}
                    onComplete={() => Promise.resolve()}
                    onUncomplete={() => Promise.resolve()}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={deleteRoutine}
                  />
                ))}
              </View>
            </CollapsibleSection>
          )}
        </ScrollView>
      )}

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.routine.newTitle")}
        onPress={() => router.push("/routine-form")}
      />
    </SafeAreaView>
  );
}
