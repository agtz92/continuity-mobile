import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, ListTodo } from "lucide-react-native";
import {
  DASHBOARD_QUERY,
  DISCONNECT_GOOGLE_TASKS,
  GOOGLE_TASKS_AUTH_URL,
  GOOGLE_TASKS_CONNECTION_QUERY,
  GOOGLE_TASK_LISTS_QUERY,
  IMPORT_GOOGLE_TASKS,
} from "@/lib/graphql";
import { toast } from "@/lib/toast";
import { Select, type SelectOption } from "@/components/settings/Select";
import { useThemeColors } from "@/theme/useThemeColors";

// returnTo is a web URL (the backend's redirect whitelist is web-only). We open
// the auth URL in the system browser; the user authorizes there, the backend
// stores the connection, and we refetch when they return to the app. This is
// the Expo-Go-friendly path — no custom-scheme deep link round-trip needed.
const RETURN_TO = "https://continuu.it/settings/plugins/google-tasks";

type Connection = { connected: boolean; email: string | null; connectedAt: string | null };
type TaskList = { id: string; title: string };
type DashboardProjects = { dashboard: { projects: { id: string; name: string }[] } };

type MappingChoice =
  | { kind: "none" }
  | { kind: "existing"; projectId: string }
  | { kind: "new"; name: string };

export default function GoogleTasks() {
  const { t } = useTranslation();
  const c = useThemeColors();

  const connectionQuery = useQuery<{ googleTasksConnection: Connection }>(
    GOOGLE_TASKS_CONNECTION_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const connection = connectionQuery.data?.googleTasksConnection;
  const connected = !!connection?.connected;

  const listsQuery = useQuery<{ googleTaskLists: TaskList[] }>(
    GOOGLE_TASK_LISTS_QUERY,
    { skip: !connected, fetchPolicy: "cache-and-network" },
  );
  const projectsQuery = useQuery<DashboardProjects>(DASHBOARD_QUERY, {
    skip: !connected,
    fetchPolicy: "cache-first",
  });
  const projects = projectsQuery.data?.dashboard?.projects ?? [];
  const lists = listsQuery.data?.googleTaskLists ?? [];

  const [choices, setChoices] = useState<Record<string, MappingChoice>>({});

  const [authUrlMutation, { loading: connecting }] = useMutation<{
    googleTasksAuthUrl: string;
  }>(GOOGLE_TASKS_AUTH_URL);
  const [importMutation, { loading: importing }] = useMutation(
    IMPORT_GOOGLE_TASKS,
    { refetchQueries: [{ query: DASHBOARD_QUERY }], awaitRefetchQueries: true },
  );
  const [disconnectMutation, { loading: disconnecting }] = useMutation(
    DISCONNECT_GOOGLE_TASKS,
    {
      refetchQueries: [{ query: GOOGLE_TASKS_CONNECTION_QUERY }],
      awaitRefetchQueries: true,
    },
  );

  const handleConnect = async () => {
    try {
      const res = await authUrlMutation({ variables: { returnTo: RETURN_TO } });
      const url = res.data?.googleTasksAuthUrl;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        // Browser dismissed — pull the latest connection/list state.
        await connectionQuery.refetch();
        if (connected) await listsQuery.refetch().catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("settings.plugins.googleTasks.errorConnect", { error: msg }));
    }
  };

  const canImport = useMemo(() => {
    if (!lists.length) return false;
    return lists.some((l) => {
      const ch = choices[l.id];
      if (!ch) return false;
      if (ch.kind === "existing") return true;
      if (ch.kind === "new") return ch.name.trim().length > 0;
      return ch.kind === "none";
    });
  }, [lists, choices]);

  const handleImport = async () => {
    const mappings = lists
      .map((l) => {
        const ch = choices[l.id];
        if (!ch) return null;
        if (ch.kind === "existing")
          return { googleListId: l.id, projectId: ch.projectId };
        if (ch.kind === "new") {
          const name = ch.name.trim();
          if (!name) return null;
          return { googleListId: l.id, newProjectName: name };
        }
        return { googleListId: l.id };
      })
      .filter(Boolean);
    if (mappings.length === 0) return;
    try {
      const res = await importMutation({ variables: { mappings } });
      const r = (
        res.data as {
          importGoogleTasks?: {
            imported: number;
            skipped: number;
            createdProjects: string[];
          };
        } | null
      )?.importGoogleTasks;
      if (r?.createdProjects?.length) {
        toast.success(
          t("settings.plugins.googleTasks.importSuccessWithProjects", {
            imported: r.imported,
            projects: r.createdProjects.join(", "),
          }),
        );
      } else {
        toast.success(
          t("settings.plugins.googleTasks.importSuccess", {
            imported: r?.imported ?? 0,
            skipped: r?.skipped ?? 0,
          }),
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("settings.plugins.googleTasks.errorImport", { error: msg }));
    }
  };

  const handleDisconnect = async () => {
    await disconnectMutation();
    setChoices({});
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      {/* Connection card */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <View className="h-10 w-10 items-center justify-center rounded-lg border border-border">
          <ListTodo size={20} color={c.accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-medium text-text">
            {t("settings.plugins.googleTasks.title")}
          </Text>
          <Text className="mt-0.5 text-xs text-text-muted">
            {connected && connection?.email
              ? t("settings.plugins.googleTasks.connectedAs", {
                  email: connection.email,
                })
              : t("settings.plugins.googleTasks.notConnectedBody")}
          </Text>
        </View>
        {connected ? (
          <Pressable
            onPress={() => void handleDisconnect()}
            disabled={disconnecting}
            accessibilityRole="button"
            className="rounded-lg border border-border px-3 py-1.5 active:opacity-80"
            style={disconnecting ? { opacity: 0.5 } : undefined}
          >
            <Text className="text-sm text-text">
              {t("settings.plugins.googleTasks.disconnectButton")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void handleConnect()}
            disabled={connecting}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 active:opacity-90"
            style={{ backgroundColor: c.accent, opacity: connecting ? 0.6 : 1 }}
          >
            {connecting ? (
              <ActivityIndicator size="small" color={c.bg} />
            ) : (
              <ExternalLink size={14} color={c.bg} />
            )}
            <Text className="text-sm font-medium" style={{ color: c.bg }}>
              {t("settings.plugins.googleTasks.connectButton")}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Import mapping */}
      {connected && (
        <View className="gap-4 rounded-2xl border border-border bg-surface p-5">
          {listsQuery.loading && !listsQuery.data ? (
            <Text className="text-sm text-text-muted">
              {t("settings.plugins.googleTasks.loadingLists")}
            </Text>
          ) : lists.length === 0 ? (
            <Text className="text-sm text-text-muted">
              {t("settings.plugins.googleTasks.noLists")}
            </Text>
          ) : (
            <>
              {lists.map((l) => (
                <MappingRow
                  key={l.id}
                  list={l}
                  projects={projects}
                  choice={choices[l.id]}
                  onChange={(ch) =>
                    setChoices((prev) => ({ ...prev, [l.id]: ch }))
                  }
                  labels={{
                    none: t("settings.plugins.googleTasks.projectNone"),
                    newProject: t("settings.plugins.googleTasks.projectNew", {
                      name: l.title,
                    }),
                  }}
                />
              ))}
              <Pressable
                onPress={() => void handleImport()}
                disabled={!canImport || importing}
                accessibilityRole="button"
                className={
                  "items-center rounded-lg py-3 " +
                  (canImport && !importing ? "bg-accent" : "bg-border")
                }
              >
                <Text
                  className={
                    "font-semibold " +
                    (canImport && !importing ? "text-bg" : "text-text-muted")
                  }
                >
                  {importing
                    ? t("settings.plugins.googleTasks.importing")
                    : t("settings.plugins.googleTasks.importButton")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function MappingRow({
  list,
  projects,
  choice,
  onChange,
  labels,
}: {
  list: TaskList;
  projects: { id: string; name: string }[];
  choice: MappingChoice | undefined;
  onChange: (c: MappingChoice) => void;
  labels: { none: string; newProject: string };
}) {
  const value = !choice
    ? ""
    : choice.kind === "none"
      ? "__none__"
      : choice.kind === "existing"
        ? `existing:${choice.projectId}`
        : "__new__";

  const options: SelectOption[] = [
    { value: "__none__", label: labels.none },
    ...projects.map((p) => ({ value: `existing:${p.id}`, label: p.name })),
    { value: "__new__", label: labels.newProject },
  ];

  return (
    <View className="gap-1.5">
      <Text className="text-sm text-text">{list.title}</Text>
      <Select
        title={list.title}
        value={value}
        options={options}
        onChange={(v) => {
          if (v === "__none__") onChange({ kind: "none" });
          else if (v === "__new__")
            onChange({ kind: "new", name: list.title });
          else if (v.startsWith("existing:"))
            onChange({
              kind: "existing",
              projectId: v.slice("existing:".length),
            });
        }}
      />
    </View>
  );
}
