import { useMutation } from "@apollo/client/react";
import { useTranslation } from "react-i18next";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  CREATE_PROJECT_NOTE,
  DASHBOARD_QUERY,
  MARK_BACKUP,
} from "@/lib/graphql";
import { toast } from "@/lib/toast";
import { daysSince } from "@/lib/date";
import type {
  Activity,
  Idea,
  Project,
  ProjectNote,
  Task,
} from "@/lib/types";
import { useProjectMutations } from "./useProjectMutations";
import { useTaskMutations } from "./useTaskMutations";
import { useIdeaMutations } from "./useIdeaMutations";
import { useNoteMutations } from "./useNoteMutations";

type Snapshot = {
  projects: Project[];
  tasks: Task[];
  ideas: Idea[];
  activities: Activity[];
  projectNotes: ProjectNote[];
};

// Legacy snapshot shape (pre-unification): `updates` field with a flat list
// of user-authored notes. We still accept these on import and restore them
// as kind=NOTE activities; achievements aren't reconstructed.
type LegacyUpdate = {
  id: string;
  projectId: string;
  note: string;
  date: string;
};

export function useBackup({
  snapshot,
  lastBackup,
  refetch,
}: {
  /** Current dashboard data — used as the export source and for "replace" cleanup. */
  snapshot: Snapshot;
  lastBackup: string | null;
  refetch: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const tt = (key: string, opts?: Record<string, unknown>) =>
    t(`modals.backup.toast.${key}`, opts);
  const [markBackupM] = useMutation(MARK_BACKUP, {
    refetchQueries: [{ query: DASHBOARD_QUERY }],
  });
  const projectMut = useProjectMutations();
  const taskMut = useTaskMutations();
  const ideaMut = useIdeaMutations();
  const noteMut = useNoteMutations();
  const [createNoteRaw] = useMutation(CREATE_PROJECT_NOTE);

  const daysSinceBackup = lastBackup ? daysSince(lastBackup) : null;
  const backupOverdue =
    !lastBackup || (daysSinceBackup !== null && daysSinceBackup >= 7);

  // Write the snapshot to a cache file and hand it to the OS share sheet
  // (AirDrop / Files / Mail / etc.) — the RN equivalent of the web's
  // anchor-download.
  const exportData = async () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      ...snapshot,
    };
    const json = JSON.stringify(payload, null, 2);
    const date = new Date().toISOString().split("T")[0];

    try {
      const file = new File(Paths.cache, `continuity-backup-${date}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          UTI: "public.json",
          dialogTitle: `continuity-backup-${date}.json`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(tt("readError", { message: msg }));
      return;
    }

    try {
      await markBackupM();
      toast.success(tt("exported"));
    } catch {
      // markBackup failed but the file already shared — don't claim success
    }
    refetch();
  };

  // Pick a JSON export with the system document picker, then restore it.
  const importData = async (mode: "merge" | "replace") => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    let parsed: {
      version?: number;
      projects?: Project[];
      tasks?: Task[];
      ideas?: Idea[];
      activities?: Activity[];
      updates?: LegacyUpdate[]; // legacy v1 backups
      projectNotes?: ProjectNote[];
    };
    try {
      const text = await new File(picked.assets[0].uri).text();
      parsed = JSON.parse(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(tt("readError", { message: msg }));
      return;
    }
    if (!parsed.version || !Array.isArray(parsed.projects)) {
      toast.error(tt("invalidFile"));
      return;
    }

    try {
      if (mode === "replace") {
        await Promise.all(
          snapshot.projects.map((p) =>
            projectMut.raw.deleteProject({ variables: { id: p.id } })
          )
        );
        await Promise.all(
          snapshot.tasks.map((t) =>
            taskMut.raw.deleteTask({ variables: { id: t.id } })
          )
        );
        await Promise.all(
          snapshot.ideas.map((i) =>
            ideaMut.raw.deleteIdea({ variables: { id: i.id } })
          )
        );
      }

      // Recreate projects (server assigns new ids; map old → new for tasks/notes).
      const idMap: Record<string, string> = {};
      for (const p of parsed.projects as Project[]) {
        const res = await projectMut.raw.createProject({
          variables: {
            data: {
              name: p.name,
              description: p.description || "",
              why: p.why || "",
              nextStep: p.nextStep || "",
              status: p.status || "idea",
              dueDate: p.dueDate ?? null,
            },
          },
        });
        const newId = (res.data as { createProject?: { id?: string } } | null)
          ?.createProject?.id;
        if (newId) idMap[p.id] = newId;
      }
      for (const t of (parsed.tasks || []) as Task[]) {
        await taskMut.raw.createTask({
          variables: {
            data: {
              title: t.title,
              projectId: t.projectId ? idMap[t.projectId] || null : null,
              dueDate: t.dueDate,
              done: !!t.done,
              effortHours: t.effortHours ?? null,
            },
          },
        });
      }
      for (const i of (parsed.ideas || []) as Idea[]) {
        await ideaMut.raw.createIdea({
          variables: {
            data: { title: i.title, description: i.description || "", why: i.why || "" },
          },
        });
      }

      // Note import: prefer v2 `activities` (only kind=note); fall back to v1
      // legacy `updates`. We deliberately only restore notes — achievements
      // (task_completed, project_created, …) are runtime observations, not
      // user data.
      let restoredNotes = 0;
      const noteActivities = (parsed.activities || []).filter(
        (a) => a.kind === "note"
      );
      for (const a of noteActivities) {
        const newProjectId = a.projectId ? idMap[a.projectId] : null;
        if (newProjectId) {
          await noteMut.raw.addNote({
            variables: { projectId: newProjectId, note: a.note },
          });
          restoredNotes += 1;
        }
      }
      for (const u of parsed.updates || []) {
        const newProjectId = idMap[u.projectId];
        if (newProjectId) {
          await noteMut.raw.addNote({
            variables: { projectId: newProjectId, note: u.note },
          });
          restoredNotes += 1;
        }
      }

      for (const n of (parsed.projectNotes || []) as ProjectNote[]) {
        const newProjectId = idMap[n.projectId];
        if (newProjectId) {
          await createNoteRaw({
            variables: {
              data: {
                projectId: newProjectId,
                title: n.title || "",
                body: n.body || "",
              },
            },
          });
        }
      }
      await refetch();
      toast.success(
        tt("imported", {
          projects: parsed.projects?.length || 0,
          tasks: parsed.tasks?.length || 0,
          ideas: parsed.ideas?.length || 0,
          notes: restoredNotes,
          projectNotes: parsed.projectNotes?.length || 0,
        })
      );
    } catch {
      // a mutation failed mid-import; refresh to reflect partial state.
      refetch();
    }
  };

  return {
    exportData,
    importData,
    daysSinceBackup,
    backupOverdue,
  };
}
