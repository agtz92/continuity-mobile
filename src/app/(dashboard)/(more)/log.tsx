import { useMemo, useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  CheckCircle2,
  FileText,
  NotebookPen,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import type { Activity, ActivityKind } from "@/lib/types";
import { toLocalISO, todayLocalISODate, weekStartISO } from "@/lib/date";
import { confirmAsync } from "@/lib/confirm";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { alpha, useThemeColors, type ThemeColors } from "@/theme/useThemeColors";

type Filter = "all" | "achievements" | "notes" | "changes" | "deleted";
const FILTERS: Filter[] = ["all", "achievements", "notes", "changes", "deleted"];

const ACHIEVEMENT_KINDS: ActivityKind[] = [
  "task_completed",
  "project_created",
  "idea_promoted",
  "routine_completed",
];
const CHANGE_KINDS: ActivityKind[] = [
  "project_status_changed",
  "project_due_date_changed",
  "task_due_date_changed",
];
const DELETED_KINDS: ActivityKind[] = [
  "project_deleted",
  "task_deleted",
  "idea_deleted",
  "routine_deleted",
  "quick_note_deleted",
];


function matchesFilter(kind: ActivityKind, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "notes") return kind === "note";
  if (f === "achievements") return ACHIEVEMENT_KINDS.includes(kind);
  if (f === "changes") return CHANGE_KINDS.includes(kind);
  if (f === "deleted") return DELETED_KINDS.includes(kind);
  return true;
}

/**
 * El icono del evento. **La forma es la que distingue**, no el color.
 *
 * Antes cada tipo tenía su tono de Tailwind —esmeralda, ámbar, morado, cian,
 * azul— y el log se leía como un arcoíris donde nada pesaba más que nada. El
 * glifo ya dice si algo se creó, se completó o se borró; el color solo tiene
 * que decir el **registro**: hecho, tuyo, roto, o mero cambio.
 */
function iconFor(kind: ActivityKind, c: ThemeColors) {
  switch (kind) {
    case "note":
      return <FileText size={14} color={c.accent} />;
    case "task_completed":
    case "routine_completed":
      return <CheckCircle2 size={14} color={c.closed} />;
    case "project_created":
    case "idea_created":
    case "task_created":
    case "routine_created":
      return <Sparkles size={14} color={c.accent} />;
    case "idea_promoted":
      return <Rocket size={14} color={c.accent} />;
    case "quick_note_created":
      return <NotebookPen size={14} color={c.accent} />;
    case "project_status_changed":
      return <RefreshCw size={14} color={c.text3} />;
    case "project_due_date_changed":
    case "task_due_date_changed":
      return <Calendar size={14} color={c.text3} />;
    case "project_deleted":
    case "task_deleted":
    case "idea_deleted":
    case "routine_deleted":
    case "quick_note_deleted":
      return <Trash2 size={14} color={alpha(c.signal, 0.7)} />;
    default:
      return <FileText size={14} color={c.textMuted} />;
  }
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Translate = (key: string, params?: Record<string, string>) => string;

/** Renders an activity into a human-readable, localized line. */
function describe(a: Activity, locale: string, t: Translate): string {
  const e = (k: string, p?: Record<string, string>) =>
    t(`views.log.entries.${k}`, p);
  const status = (v: string) => t(`status.${v}`);
  const title = a.entityTitle || e("untitled");
  switch (a.kind) {
    case "note":
      return a.note;
    case "task_completed":
      return e("taskCompleted", { title });
    case "task_created":
      return e("taskCreated", { title });
    case "task_deleted":
      return e("taskDeleted", { title });
    case "task_due_date_changed":
      return a.newValue
        ? e("taskRescheduled", { title, date: formatDate(a.newValue, locale) })
        : e("taskDueCleared", { title });
    case "project_created":
      return e("projectCreated", { title });
    case "project_deleted":
      return e("projectDeleted", { title });
    case "project_status_changed":
      return e("projectStatusChanged", {
        title,
        previous: a.previousValue ? status(a.previousValue) : "",
        next: a.newValue ? status(a.newValue) : "",
      });
    case "project_due_date_changed":
      return a.newValue
        ? e("projectDueSet", { title, date: formatDate(a.newValue, locale) })
        : e("projectDueCleared", { title });
    case "idea_created":
      return e("ideaCreated", { title });
    case "idea_deleted":
      return e("ideaDeleted", { title });
    case "idea_promoted":
      return e("ideaPromoted", { title });
    case "routine_created":
      return e("routineCreated", { title });
    case "routine_completed":
      return e("routineCompleted", { title });
    case "routine_deleted":
      return e("routineDeleted", { title });
    case "quick_note_created":
      return e("quickNoteCreated", { title });
    case "quick_note_deleted":
      return e("quickNoteDeleted", { title });
    default:
      return a.entityTitle;
  }
}

type BucketKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";
const BUCKET_ORDER: BucketKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
];

export default function Log() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const locale = i18n.language;
  const { activities, projects, initialLoading, refetch } = useDashboardData();
  const { deleteNote } = useNoteMutations();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const boundaries = useMemo(() => {
    const today = todayLocalISODate();
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = toLocalISO(yDate);
    const weekStart = weekStartISO();
    const monthDate = new Date();
    monthDate.setDate(1);
    const monthStart = toLocalISO(monthDate);
    return { today, yesterday, weekStart, monthStart };
  }, []);

  const bucketFor = (iso: string): BucketKey => {
    const date = iso.slice(0, 10);
    if (date === boundaries.today) return "today";
    if (date === boundaries.yesterday) return "yesterday";
    if (date >= boundaries.weekStart) return "thisWeek";
    if (date >= boundaries.monthStart) return "thisMonth";
    return "older";
  };

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      activities
        .filter((a) => {
          if (!matchesFilter(a.kind, filter)) return false;
          if (!q) return true;
          const proj = projects.find((p) => p.id === a.projectId);
          const haystack = [
            a.note,
            a.entityTitle,
            proj?.name ?? "",
            a.previousValue,
            a.newValue,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
        .sort(
          (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
        ),
    [activities, projects, filter, q]
  );

  const grouped = useMemo(() => {
    const buckets: Record<BucketKey, Activity[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };
    for (const a of visible) buckets[bucketFor(a.created)].push(a);
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, boundaries]);

  // Sections for the virtualized SectionList (drops empty buckets).
  const sections = useMemo(
    () =>
      BUCKET_ORDER.map((bucket) => ({
        key: bucket,
        title: t(`views.log.buckets.${bucket}`),
        data: grouped[bucket],
      })).filter((s) => s.data.length > 0),
    [grouped, t]
  );

  const onDelete = async (id: string) => {
    if (await confirmAsync(t("views.log.deleteConfirm"))) deleteNote(id);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <ScreenTitle>
          {t("views.log.title")}
        </ScreenTitle>

        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.log.search")}
            placeholderTextColor={c.textMuted}
            className="flex-1 py-2.5"
            style={{ color: c.text }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-1.5 pr-2"
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={
                  "rounded-full border px-3 py-1.5 " +
                  (active
                    ? "border-accent bg-accent"
                    : "border-border bg-surface")
                }
              >
                <Text
                  className={"font-sans " + 
                    "text-xs " + (active ? "text-bg" : "text-text-muted")
                  }
                >
                  {t(`views.log.filters.${f}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {initialLoading && activities.length === 0 ? (
        <ListSkeleton />
      ) : activities.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState
            title={t("views.log.empty")}
            body={t("views.log.emptyBody")}
          />
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState
            title={
              q
                ? t("views.log.noMatch", { query: search.trim() })
                : t("views.log.noneInFilter")
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          renderSectionHeader={({ section }) => (
            <Meta variant="cintillo" tone="muted" className="mb-2 mt-4 px-1">
              {section.title} · {section.data.length}
            </Meta>
          )}
          renderItem={({ item: a }) => {
            const proj = projects.find((p) => p.id === a.projectId);
            const isNote = a.kind === "note";
            return (
              <View className="mb-2 flex-row gap-3 rounded-lg border border-border bg-surface p-3">
                <View style={{ marginTop: 2 }}>{iconFor(a.kind, c)}</View>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans mb-0.5 text-xs text-text-muted">
                    {formatDate(a.created, locale)}
                  </Text>
                  {proj && (
                    <Text className="font-sans mb-0.5 text-xs text-accent">{proj.name}</Text>
                  )}
                  <Text className="font-sans text-sm text-text">
                    {describe(a, locale, t)}
                  </Text>
                </View>
                {isNote && (
                  <Pressable
                    onPress={() => onDelete(a.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t("views.log.deleteEntryAria")}
                    hitSlop={8}
                  >
                    <X size={14} color={c.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
