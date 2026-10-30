import { memo, type ReactElement } from "react";
import { Text, View } from "react-native";
import {
  Calendar,
  CheckCircle2,
  FileText,
  NotebookPen,
  RefreshCw,
  Rocket,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";

import { IconAction } from "@/components/ui/IconAction";
import { Meta } from "@/components/ui/Meta";
import type { Activity, ActivityKind } from "@/lib/types";
import { useThemeColors, type ThemeColors } from "@/theme/useThemeColors";

export type LogFilter = "all" | "notes" | "done" | "changes" | "deleted";
export const LOG_FILTERS: LogFilter[] = ["all", "notes", "done", "changes", "deleted"];

const DONE_KINDS: ActivityKind[] = [
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

export function matchesFilter(kind: ActivityKind, f: LogFilter): boolean {
  if (f === "all") return true;
  if (f === "notes") return kind === "note";
  if (f === "done") return DONE_KINDS.includes(kind);
  if (f === "changes") return CHANGE_KINDS.includes(kind);
  if (f === "deleted") return DELETED_KINDS.includes(kind);
  return true;
}

/**
 * El icono del evento (18 px). **La forma distingue**, no el color: el color
 * solo dice el registro — hecho (`closed`), tuyo (`accent`), roto (`signal`) o
 * mero cambio (tinta).
 */
function iconFor(kind: ActivityKind, c: ThemeColors): ReactElement {
  const s = 18;
  switch (kind) {
    case "note":
      return <FileText size={s} color={c.accent} />;
    case "task_completed":
    case "routine_completed":
      return <CheckCircle2 size={s} color={c.closed} />;
    case "project_created":
    case "idea_created":
    case "task_created":
    case "routine_created":
      return <Sparkles size={s} color={c.accent} />;
    case "idea_promoted":
      return <Rocket size={s} color={c.accent} />;
    case "quick_note_created":
      return <NotebookPen size={s} color={c.accent} />;
    case "project_status_changed":
      return <RefreshCw size={s} color={c.text3} />;
    case "project_due_date_changed":
    case "task_due_date_changed":
      return <Calendar size={s} color={c.text3} />;
    case "project_deleted":
    case "task_deleted":
    case "idea_deleted":
    case "routine_deleted":
    case "quick_note_deleted":
      return <Trash2 size={s} color={c.signal} />;
    default:
      return <FileText size={s} color={c.text3} />;
  }
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * Línea legible y localizada de un evento. `title` entra como parámetro para
 * que quien pinta pueda pasar un marcador y ponerlo en negrita.
 */
export function describe(a: Activity, locale: string, t: Translate, title: string): string {
  const e = (k: string, p?: Record<string, string>) => t(`views.log.entries.${k}`, p);
  const status = (v: string) => t(`status.${v}`);
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
      return title;
  }
}

// Marcador improbable en texto real: separa la entidad para ponerla en negrita.
const MARK = "⁣⁣";

/**
 * Fila del log (3c): columna de hora de 56 px, icono 18, texto 15 con la
 * entidad en negrita y el proyecto como cintillo. Las notas se pueden borrar
 * (✕ de 44 px); el resto del log es historia y no se toca.
 */
export const LogRow = memo(function LogRow({
  activity: a,
  time,
  projectName,
  locale,
  t,
  onDeleteNote,
  deleteLabel,
  last,
}: {
  activity: Activity;
  /** "14:02" en hoy/ayer, "Oct 21" más atrás. */
  time: string;
  projectName: string | null;
  locale: string;
  t: Translate;
  onDeleteNote: (id: string) => void;
  deleteLabel: string;
  last?: boolean;
}) {
  const c = useThemeColors();
  const title = a.entityTitle || t("views.log.entries.untitled");
  const parts = describe(a, locale, t, `${MARK}${title}${MARK}`).split(MARK);
  const isNote = a.kind === "note";
  return (
    <View
      className="flex-row items-start"
      style={{
        minHeight: 56,
        paddingVertical: 14,
        gap: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line[14],
      }}
    >
      <Meta tone="muted" style={{ width: 56, fontSize: 13, lineHeight: 21 }}>
        {time}
      </Meta>
      <View style={{ paddingTop: 1 }}>{iconFor(a.kind, c)}</View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans" style={{ fontSize: 15, lineHeight: 21, color: c.text2 }}>
          {parts.map((p, i) =>
            // Las piezas impares son la entidad.
            i % 2 === 1 ? (
              <Text key={i} className="font-sans-semibold" style={{ color: c.text }}>
                {p}
              </Text>
            ) : (
              p
            ),
          )}
        </Text>
        {projectName ? (
          <Meta variant="cintillo" tone="faint" className="mt-1">
            {projectName}
          </Meta>
        ) : null}
      </View>
      {isNote ? (
        <View style={{ marginTop: -12, marginRight: -10 }}>
          <IconAction icon={X} label={deleteLabel} iconSize={18} onPress={() => onDeleteNote(a.id)} />
        </View>
      ) : null}
    </View>
  );
});
