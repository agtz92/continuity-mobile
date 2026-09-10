/**
 * Meter lo recién capturado en la caché del dashboard, sin esperar a la red.
 *
 * **Espejo de `continuity/frontend/src/lib/captureCache.ts`** (los tests viven
 * allá, ver la nota de paridad en `quickParse.ts`).
 *
 * **El problema.** Toda la app cuelga de una sola query, `DASHBOARD_QUERY`, y
 * cada mutación la vuelve a pedir entera. Para la cuenta más grande de hoy eso
 * son 1.354 activities y 352 tareas —medido: ~1,3 s solo de servidor, más el
 * viaje y el re-render— para enseñar **un renglón nuevo**. Capturabas un update
 * y el Log se quedaba como estaba un par de segundos: el tiempo suficiente para
 * pensar que no se había guardado.
 *
 * **Por qué no es "recargar".** Recargar la página en Next re-monta la app
 * entera, vuelve a pedir la misma query y encima pierde el estado de la vista:
 * más lento que esperar. Lo que hace falta es lo contrario — no pedir nada.
 *
 * **Qué hace esto.** Las tres mutaciones de la captura ya devuelven el objeto
 * creado con **exactamente** los campos que `DASHBOARD_QUERY` selecciona, así
 * que se puede insertar en la lista cacheada y la interfaz lo pinta en el
 * mismo frame. El refetch sigue disparándose por detrás para reconciliar lo que
 * el servidor deriva y aquí no sabemos (el `lastActivity` del proyecto, el
 * enfriamiento, los contadores).
 */

/** Las listas del dashboard donde puede aterrizar una captura. */
export type DashboardList = "tasks" | "ideas" | "activities";

interface Entity {
  id: string;
}

interface DashboardShape {
  dashboard?: Record<string, unknown>;
}

/**
 * Devuelve el resultado cacheado con `entity` al principio de `list`, o
 * `undefined` para dejar la caché intacta.
 *
 * `undefined` (que Apollo lee como "no toques nada") en dos casos:
 *
 * - **No hay nada cacheado todavía.** Escribir un dashboard con una sola tarea
 *   dentro sería mentir: el resto de la app leería una caché con un solo
 *   elemento. Que la primera carga la haga la query.
 * - **El id ya está.** El refetch pudo llegar antes; duplicar el renglón es
 *   peor que no añadirlo.
 */
export function insertIntoDashboard<T extends DashboardShape>(
  previous: T | null | undefined,
  list: DashboardList,
  entity: Entity | null | undefined
): T | undefined {
  if (!previous?.dashboard || !entity?.id) return undefined;

  const current = previous.dashboard[list];
  if (!Array.isArray(current)) return undefined;

  const already = current.some(
    (item) => (item as Entity | null)?.id === entity.id
  );
  if (already) return undefined;

  return {
    ...previous,
    dashboard: {
      ...previous.dashboard,
      // Al principio: lo recién capturado es lo más nuevo, y las vistas que
      // ordenan por fecha lo van a recolocar igual en cuanto rendericen.
      [list]: [entity, ...current],
    },
  };
}
