import type { Cooling, Project } from "@/lib/types";
import { daysSince } from "@/lib/date";

/**
 * Lectura del enfriamiento de un proyecto. **Espejo de la web**
 * (`frontend/src/lib/cooling.ts`), campo por campo.
 *
 * El servidor ya manda `daysSinceTouch`, `cooling`, `isBlocked` y `blockedSince`
 * derivados (backend `core/services/cooling.py`) para que web y móvil no
 * discrepen en los tramos. Estos helpers son **solo el fallback**: los campos
 * son opcionales en el tipo porque una respuesta cacheada de un cliente viejo
 * puede no traerlos.
 *
 * Los umbrales están duplicados a propósito y deben coincidir con los del
 * backend: 0-7 templado · 8-21 enfriándose · 22+ frío.
 */
const WARM_MAX = 7;
const COOL_MAX = 21;

/** Días desde el último movimiento. */
export function projectDays(p: Project): number {
  return p.daysSinceTouch ?? daysSince(p.lastActivity) ?? 0;
}

export function projectCooling(p: Project): Cooling {
  if (p.cooling) return p.cooling;
  const d = projectDays(p);
  if (d > COOL_MAX) return "cold";
  if (d > WARM_MAX) return "cool";
  return "warm";
}

/**
 * "Atorado": al menos una tarea abierta con blocker. No es un estado del
 * modelo. Sin el campo del servidor hace falta contar tareas, así que quien
 * llame pasa el conteo local que ya tenga a mano.
 */
export function projectIsBlocked(p: Project, blockedTaskCount = 0): boolean {
  return p.isBlocked ?? blockedTaskCount > 0;
}

/** Días que lleva atorado. Sin `blockedSince` cae a los días sin tocar. */
export function projectBlockedDays(p: Project): number {
  return p.blockedSince ? (daysSince(p.blockedSince) ?? 0) : projectDays(p);
}

/** ¿Esta tarea está detenida? Un blocker en la lista es un blocker abierto. */
export function taskIsBlocked(t: { blockers?: unknown[] }): boolean {
  return (t.blockers?.length ?? 0) > 0;
}
