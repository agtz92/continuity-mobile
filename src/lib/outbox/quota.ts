import type { ApolloCache } from "@apollo/client";
import { DASHBOARD_QUERY, QUICK_NOTES_QUERY } from "@/lib/graphql";
import i18n from "@/lib/i18n";
import type { OpKind } from "./ops";

/**
 * El tope del plan, revisado en el teléfono antes de encolar un create sin red.
 *
 * **Espejo de `check_entity_quota` (backend `core/quotas.py`)**, con las dos
 * capas: si ya te pasaste del tope de cualquier tipo bloqueante no se crea
 * nada, y si no, el tipo que se crea no puede llegar a su tope. Plan, topes y
 * tipos bloqueantes llegan del servidor en `dashboard.quota`; los conteos salen
 * de la caché, que ya incluye lo creado offline pendiente de mandar.
 *
 * Sin red, crear algo que el servidor iba a rechazar significaba verlo
 * desaparecer al reconectar. Así el formulario se queda abierto con el mismo
 * aviso que da el servidor. El servidor sigue decidiendo: si algo se cuela
 * (p. ej. se creó desde la web mientras tanto), la cola lo guarda en "No se
 * pudo guardar" en vez de tirarlo.
 */

export interface QuotaHit {
  kind: string;
  current: number;
  cap: number;
  plan: string;
}

type Vars = Record<string, any>;
type Check = { kind: string; parent?: string | null };

/** Qué topes revisa el servidor en cada create, en el mismo orden. */
const CHECKS: Partial<Record<OpKind, (v: Vars) => Check[]>> = {
  "task.create": (v) => [
    { kind: "tasks_total" },
    ...(v.data.projectId ? [{ kind: "tasks_per_project", parent: v.data.projectId }] : []),
  ],
  "idea.create": () => [{ kind: "ideas" }],
  "routine.create": () => [{ kind: "routines" }],
  "projectNote.add": (v) => [{ kind: "notes_per_project", parent: v.projectId }],
  "quickNote.create": () => [{ kind: "quick_notes" }],
  "section.add": (v) => [{ kind: "sections_per_note", parent: v.noteId }],
};

interface QuotaInfo {
  plan: string;
  caps: Array<{ kind: string; cap: number | null }>;
  blockingKinds: string[];
}

type Dashboard = Record<string, any> & { quota?: QuotaInfo };

/** Cuántos hay de `kind`, igual que `_count` del backend. `null` = no se sabe. */
function count(
  cache: ApolloCache,
  dash: Dashboard,
  kind: string,
  parent?: string | null
): number | null {
  const list = (key: string): Array<Record<string, any>> =>
    Array.isArray(dash[key]) ? dash[key] : [];
  switch (kind) {
    case "projects":
      return list("projects").filter((p) => p.status !== "archived" && p.status !== "killed")
        .length;
    case "tasks_total":
      return list("tasks").filter((t) => !t.done).length;
    case "tasks_per_project":
      return parent ? list("tasks").filter((t) => !t.done && t.projectId === parent).length : 0;
    case "routines":
      return list("routines").filter((r) => !r.archived).length;
    case "ideas":
      return list("ideas").length;
    case "categories":
      return list("categories").length;
    case "notes_per_project":
      return parent ? list("projectNotes").filter((n) => n.projectId === parent).length : 0;
    case "quick_notes":
    case "sections_per_note": {
      const data = cache.readQuery({ query: QUICK_NOTES_QUERY }) as {
        quickNotes?: Array<Record<string, any>>;
      } | null;
      if (!Array.isArray(data?.quickNotes)) return null;
      if (kind === "quick_notes") return data.quickNotes.length;
      if (!parent) return 0;
      return data.quickNotes.find((n) => n.id === parent)?.sections?.length ?? 0;
    }
    default:
      return null;
  }
}

/** El primer tope que el servidor rechazaría para esta operación, o `null`. */
export function quotaHit(cache: ApolloCache, kind: OpKind, vars: Vars): QuotaHit | null {
  const checks = CHECKS[kind]?.(vars);
  if (!checks) return null;
  let dash: Dashboard | undefined;
  try {
    dash = (cache.readQuery({ query: DASHBOARD_QUERY }) as { dashboard?: Dashboard } | null)
      ?.dashboard;
  } catch {
    return null;
  }
  const quota = dash?.quota;
  if (!dash || !quota) return null;
  const capOf = (k: string) => quota.caps.find((c) => c.kind === k)?.cap ?? null;

  for (const check of checks) {
    // Capa 1: ya excedido en cualquier tipo bloqueante → no se crea nada.
    for (const other of quota.blockingKinds) {
      if (other === check.kind) continue;
      const cap = capOf(other);
      if (cap == null) continue;
      const current = count(cache, dash, other);
      if (current != null && current > cap) {
        return { kind: other, current, cap, plan: quota.plan };
      }
    }
    // Capa 2: este tipo llegaría a su tope.
    const cap = capOf(check.kind);
    if (cap == null) continue;
    const current = count(cache, dash, check.kind, check.parent);
    if (current != null && current >= cap) {
      return { kind: check.kind, current, cap, plan: quota.plan };
    }
  }
  return null;
}

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
  admin: "Admin",
};

/** El aviso de tope en el idioma del usuario (`errors.quota.<kind>`). */
export function quotaMessage(hit: QuotaHit): string {
  const vars = { ...hit, plan: PLAN_NAMES[hit.plan] ?? hit.plan };
  const key = `errors.quota.${hit.kind}`;
  return i18n.exists(key) ? i18n.t(key, vars) : i18n.t("errors.quota.default", vars);
}
