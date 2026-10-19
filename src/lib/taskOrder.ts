import type { Task } from "@/lib/types";

/**
 * Orden manual de las tareas dentro de un proyecto (drag & drop del detalle).
 * `position` es denso por proyecto y lo asigna el backend; el desempate por
 * `created` (más nueva al final) solo importa si dos quedaran empatadas.
 * Espejo de `frontend/src/lib/taskOrder.ts` (los tests viven allá).
 */
export function byManualOrder(a: Task, b: Task): number {
  return (a.position ?? 0) - (b.position ?? 0) || a.created.localeCompare(b.created);
}

type Dated = Pick<Task, "id" | "dueDate">;

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Fecha que le corresponde a una tarea recién soltada en `ordered`.
 *
 * Toma la fecha de la vecina que rebasó: si subió, la de la tarea que ahora
 * tiene debajo (se adelantó a ella); si bajó, la de la que tiene encima. Si esa
 * vecina no tiene fecha, prueba con la del otro lado.
 *
 * Devuelve `null` cuando no hay nada que cambiar: ninguna vecina tiene fecha,
 * o la tarea ya tenía una que respeta el nuevo orden (no es anterior a la de
 * arriba ni posterior a la de abajo). Quién decide si preguntar o aplicarla
 * sola es el llamador: con fecha previa se pregunta, sin ella se aplica.
 */
export function suggestDueDateAfterMove(
  ordered: Dated[],
  movedId: string,
  direction: "up" | "down"
): string | null {
  const idx = ordered.findIndex((t) => t.id === movedId);
  if (idx < 0) return null;
  const moved = ordered[idx];
  const prev = ordered[idx - 1]?.dueDate ?? null;
  const next = ordered[idx + 1]?.dueDate ?? null;

  const anchor = direction === "up" ? (next ?? prev) : (prev ?? next);
  if (!anchor) return null;

  if (moved.dueDate) {
    const own = ms(moved.dueDate);
    const fits = (!prev || ms(prev) <= own) && (!next || own <= ms(next));
    if (fits) return null;
  }
  return anchor;
}
