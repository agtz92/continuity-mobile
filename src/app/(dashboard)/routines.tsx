import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
  type SectionListData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react-native";
import type { Routine } from "@/lib/types";
import { todayLocalISODate, toLocalISO } from "@/lib/date";
import { completedDatesFor, computeDueDates } from "@/lib/recurrence";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { FAB } from "@/components/ui/FAB";
import { RoutineRow } from "@/components/routines/RoutineRow";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

const HORIZON_DAYS = 7; // how far ahead we materialize pending occurrences for "Upcoming"
const BACKLOG_DAYS = 14; // how far back we surface missed pending occurrences
const LATER_LOOKAHEAD = 365; // one row per routine whose next date is beyond the horizon

interface DueItem {
  routine: Routine;
  scheduledDate: string;
  occurrenceId: string | null;
}

type BucketKey = "today" | "completed" | "upcoming" | "later" | "archived";

/** Fila centinela: el bucket "Today & overdue" abierto y vacío. */
const EMPTY_ROW = "__empty__" as const;
type Item = DueItem | typeof EMPTY_ROW;

type Bucket = {
  key: BucketKey;
  title: string;
  count: number;
  open: boolean;
  /** Las filas del bucket exponen archivar/restaurar. */
  withArchive: boolean;
  data: Item[];
};

/**
 * Routines (1k), rediseño "Breathe": titular "N due today. / N is late.",
 * buscador de 44 y buckets como cabecera plegable sobre fondo plano (sin
 * tarjeta exterior); cerrados se leen como filas de ~48 con el conteo a la
 * derecha. Virtualizada con `SectionList`.
 */
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
  const [openState, setOpenState] = useState<Record<BucketKey, boolean>>({
    today: true,
    completed: false,
    upcoming: false,
    later: false,
    archived: false,
  });

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
  const searching = q.length > 0;

  // Titular: lo que toca hoy (incluye lo atrasado) y cuánto de eso va tarde.
  const lateCount = todayBucket.filter((it) => it.scheduledDate < today).length;

  const sections: Bucket[] = useMemo(() => {
    const byQuery = (items: DueItem[]) =>
      q ? items.filter((i) => i.routine.title.toLowerCase().includes(q)) : items;
    const archivedItems: DueItem[] = archivedRoutines.map((r) => ({
      routine: r,
      scheduledDate: r.startDate,
      occurrenceId: null,
    }));
    const out: Bucket[] = [];
    const push = (
      key: BucketKey,
      title: string,
      items: DueItem[],
      opts?: { always?: boolean; withArchive?: boolean }
    ) => {
      const filtered = byQuery(items);
      if (!opts?.always && filtered.length === 0) return;
      const open = searching || openState[key];
      out.push({
        key,
        title,
        count: filtered.length,
        open,
        withArchive: opts?.withArchive ?? false,
        data: !open ? [] : filtered.length === 0 ? [EMPTY_ROW] : filtered,
      });
    };
    push("today", t("views.routines.todayBucket"), todayBucket, {
      always: true,
      withArchive: true,
    });
    push("completed", t("views.routines.completedToday"), completedTodayBucket);
    push("upcoming", t("views.routines.upcoming"), upcomingBucket, { withArchive: true });
    push("later", t("views.routines.later"), laterBucket, { withArchive: true });
    push("archived", t("views.routines.archived"), archivedItems, { withArchive: true });
    return out;
  }, [
    q,
    searching,
    openState,
    todayBucket,
    completedTodayBucket,
    upcomingBucket,
    laterBucket,
    archivedRoutines,
    t,
  ]);

  const toggleBucket = useCallback(
    (key: BucketKey) => setOpenState((s) => ({ ...s, [key]: !s[key] })),
    []
  );

  const onArchive = useCallback(
    (r: Routine) => archiveRoutine(r.id, !r.archived),
    [archiveRoutine]
  );
  const onEdit = useCallback(
    (r: Routine) => router.push({ pathname: "/routine-form", params: { id: r.id } }),
    [router]
  );
  const noop = useCallback(() => Promise.resolve(), []);

  const renderItem = ({
    item,
    section,
  }: {
    item: Item;
    section: SectionListData<Item, Bucket>;
  }) => {
    if (item === EMPTY_ROW) {
      return (
        <Text
          className="font-sans text-center"
          style={{ fontSize: 15, color: c.text3, paddingVertical: 16 }}
        >
          {t("views.routines.todayEmpty")}
        </Text>
      );
    }
    // Las archivadas no se completan desde aquí: solo editar o restaurar.
    const archived = section.key === "archived";
    return (
      <View style={{ marginBottom: 10 }}>
        <RoutineRow
          routine={item.routine}
          scheduledDate={item.scheduledDate}
          occurrenceId={item.occurrenceId}
          project={resolveRoutineProject(item.routine)}
          onComplete={archived ? noop : completeOccurrence}
          onUncomplete={archived ? noop : uncompleteOccurrence}
          onEdit={onEdit}
          onArchive={section.withArchive ? onArchive : undefined}
          onDelete={deleteRoutine}
        />
      </View>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Item, Bucket>;
  }) => (
    <View style={{ paddingTop: 12, paddingBottom: section.open ? 6 : 0 }}>
      <View style={{ height: 1, backgroundColor: c.line[14], marginBottom: 4 }} />
      <SectionHeader
        title={section.title}
        open={section.open}
        onToggle={() => toggleBucket(section.key)}
        trailing={
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 15, fontVariant: ["tabular-nums"], color: c.text3 }}
          >
            {section.count}
          </Text>
        }
      />
    </View>
  );

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <ScreenHeadline
        primary={t("views.routines.headline.dueToday", { count: todayBucket.length })}
        secondary={
          lateCount > 0 ? t("views.routines.headline.late", { count: lateCount }) : null
        }
        secondaryTone="signal"
      />
      {routines.length > 0 ? (
        <View
          className="flex-row items-center rounded-lg border border-border bg-surface"
          style={{ height: SIZE.hit, paddingHorizontal: 12, gap: 8 }}
        >
          <Search size={18} color={c.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.routines.search")}
            placeholderTextColor={c.text5}
            accessibilityLabel={t("views.routines.search")}
            className="flex-1"
            style={{ color: c.text, fontSize: 16, height: SIZE.hit }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Admin announcements + derived alerts: en web viven sobre todas las
          vistas del dashboard, así que aquí también sobre cada pestaña. */}
      <NotificationStack className="gap-2 px-5 pt-2" />

      {routines.length === 0 ? (
        <View className="flex-1" style={{ paddingHorizontal: SIZE.gutter, paddingTop: 8 }}>
          {header}
          {initialLoading ? (
            <ListSkeleton />
          ) : (
            <EmptyState
              title={t("views.routines.empty")}
              body={t("views.routines.emptyBody")}
              rule={t("views.routines.emptyRule")}
            />
          )}
        </View>
      ) : (
        <SectionList<Item, Bucket>
          sections={sections}
          keyExtractor={(item) =>
            item === EMPTY_ROW
              ? EMPTY_ROW
              : `${item.routine.id}-${item.scheduledDate}-${item.occurrenceId ?? ""}`
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          // Elemento, no componente inline: el buscador no se remonta al teclear.
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: SIZE.gutter,
            paddingTop: 8,
            paddingBottom: 112,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        />
      )}

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.routine.newTitle")}
        onPress={() => router.push("/routine-form")}
      />
    </SafeAreaView>
  );
}
