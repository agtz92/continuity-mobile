import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Check, Plus, Search, SlidersHorizontal } from "lucide-react-native";
import type { Project, ProjectStatus } from "@/lib/types";
import { priorityRank } from "@/lib/types";
import { daysSince, isDueToday, isOverdue } from "@/lib/date";
import { STATUS_FILTER_ORDER } from "@/lib/status";
import { PROJECT_SORT_MODES, type ProjectSortMode } from "@/lib/priority";
import { useDashboardData } from "@/hooks/useDashboardData";
import { ProjectCardCompact } from "@/components/projects/ProjectCardCompact";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FAB } from "@/components/ui/FAB";
import { useThemeColors } from "@/theme/useThemeColors";

export default function Projects() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { projects, tasks, categoryById, initialLoading, refetch } =
    useDashboardData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("smart");
  const [sortSheet, setSortSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
      const idle = daysSince(p.lastActivity) ?? 0;
      if (["active", "idea"].includes(p.status) && idle >= 7) {
        counts.stalled = (counts.stalled ?? 0) + 1;
      }
    }
    return counts;
  }, [projects]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesSearch = (p: Project) => {
      if (!q) return true;
      const cat = p.categoryId ? categoryById[p.categoryId]?.name ?? "" : "";
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.nextStep.toLowerCase().includes(q) ||
        p.why.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    };

    const matchesStatus = (p: Project) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "stalled") {
        if (p.status === "stalled") return true;
        const idle = daysSince(p.lastActivity) ?? 0;
        return ["active", "idea"].includes(p.status) && idle >= 7;
      }
      return p.status === statusFilter;
    };

    const tasksByProject = (id: string) =>
      tasks.filter((tk) => tk.projectId === id);
    const urgencyBucket = (p: Project) => {
      const pt = tasksByProject(p.id);
      if (pt.some((tk) => !tk.done && isOverdue(tk.dueDate))) return 0;
      if (pt.some((tk) => !tk.done && isDueToday(tk.dueDate))) return 1;
      const idle = daysSince(p.lastActivity) ?? 0;
      if (["active", "idea"].includes(p.status) && idle >= 7) return 2;
      return 3;
    };
    const recentTs = (p: Project) => new Date(p.lastActivity).getTime();
    const byName = (a: Project, b: Project) =>
      a.name.localeCompare(b.name, i18n.language);

    const compare = (a: Project, b: Project) => {
      switch (sortMode) {
        case "priority": {
          const d = priorityRank(a.priority) - priorityRank(b.priority);
          if (d !== 0) return d;
          const r = recentTs(b) - recentTs(a);
          return r !== 0 ? r : byName(a, b);
        }
        case "recent": {
          const r = recentTs(b) - recentTs(a);
          return r !== 0 ? r : byName(a, b);
        }
        case "name":
          return byName(a, b);
        case "status": {
          const sa = STATUS_FILTER_ORDER.indexOf(a.status);
          const sb = STATUS_FILTER_ORDER.indexOf(b.status);
          if (sa !== sb) return sa - sb;
          const pd = priorityRank(a.priority) - priorityRank(b.priority);
          if (pd !== 0) return pd;
          const r = recentTs(b) - recentTs(a);
          return r !== 0 ? r : byName(a, b);
        }
        case "smart":
        default: {
          const ba = urgencyBucket(a);
          const bb = urgencyBucket(b);
          if (ba !== bb) return ba - bb;
          const pd = priorityRank(a.priority) - priorityRank(b.priority);
          if (pd !== 0) return pd;
          const r = recentTs(b) - recentTs(a);
          return r !== 0 ? r : byName(a, b);
        }
      }
    };

    return projects
      .filter((p) => matchesSearch(p) && matchesStatus(p))
      .sort(compare);
  }, [projects, tasks, categoryById, search, statusFilter, sortMode, i18n.language]);

  const statusChips = STATUS_FILTER_ORDER.filter(
    (s) => s === "all" || (statusCounts[s] ?? 0) > 0
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.projects.title")}
        </Text>

        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.projects.search")}
            placeholderTextColor={c.textMuted}
            className="flex-1 py-2.5"
            style={{ color: c.text }}
          />
        </View>

        {projects.length > 0 && (
          <View className="flex-row items-center gap-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1.5 pr-2"
              className="flex-1"
            >
              {statusChips.map((s) => {
                const active = statusFilter === s;
                const label = s === "all" ? t("status.all") : t(`status.${s}`);
                const count = statusCounts[s] ?? 0;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    className={
                      "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 " +
                      (active
                        ? "border-accent bg-accent"
                        : "border-border bg-surface")
                    }
                  >
                    <Text
                      className={
                        "text-xs font-medium " +
                        (active ? "text-bg" : "text-text-muted")
                      }
                    >
                      {label}
                    </Text>
                    <Text
                      className={
                        "text-[10px] " + (active ? "text-bg" : "text-text-muted")
                      }
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setSortSheet(true)}
              className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color={c.textMuted} />
              <Text className="text-xs text-text-muted">
                {t(`views.projects.sortBy.${sortMode}`)}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {initialLoading && projects.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-text-muted">…</Text>
        </View>
      ) : projects.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-text-muted">
            {t("views.projects.empty")}
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-5">
          <Text className="text-center text-text-muted">
            {search.trim()
              ? t("views.projects.noMatchSearch", { query: search.trim() })
              : t("views.projects.noMatchFilters")}
          </Text>
          {(statusFilter !== "all" || !!search.trim()) && (
            <Pressable
              onPress={() => {
                setStatusFilter("all");
                setSearch("");
              }}
              className="rounded-md border border-border bg-surface px-3 py-1.5"
            >
              <Text className="text-xs text-text">
                {t("views.projects.clearFilters")}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          renderItem={({ item }) => (
            <ProjectCardCompact
              project={item}
              projectTasks={tasks.filter((tk) => tk.projectId === item.id)}
              variant={item.status === "launched" ? "launched" : "active"}
              categoryById={categoryById}
              onPress={() =>
                router.push({ pathname: "/project/[id]", params: { id: item.id } })
              }
            />
          )}
        />
      )}

      <BottomSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title={t("views.projects.sortSheet.title")}
      >
        <View className="gap-1">
          {PROJECT_SORT_MODES.map((m) => {
            const active = sortMode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  setSortMode(m);
                  setSortSheet(false);
                }}
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
              >
                <Text className={active ? "text-accent" : "text-text"}>
                  {t(`views.projects.sortBy.${m}`)}
                </Text>
                {active && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.project.newTitle")}
        onPress={() => router.push("/project-form")}
      />
    </SafeAreaView>
  );
}
