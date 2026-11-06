/**
 * Progreso de un proyecto con el dashboard recortado.
 *
 * El dashboard solo trae las completadas de los últimos `DASHBOARD_DONE_TASK_DAYS`
 * días; las anteriores llegan contadas por proyecto (`olderDoneCount` y sus
 * horas, del servidor). Contar solo las tareas cacheadas haría bajar el
 * progreso de un proyecto con el paso del tiempo, sin que nadie tocara nada.
 * Las cacheadas se siguen contando aquí para que palomear se vea al instante.
 * Espejo literal de `continuity/frontend/src/lib/projectProgress.ts`.
 */
import type { Project, Task } from "@/lib/types";

type Counts = Pick<Project, "olderDoneCount" | "olderDoneEffortHours">;

/** Completadas del proyecto: las de la ventana (caché) + las anteriores. */
export function doneTaskCount(project: Counts, projectTasks: Task[]): number {
  return (project.olderDoneCount ?? 0) + projectTasks.filter((t) => t.done).length;
}

/** Total de tareas del proyecto, contando las completadas fuera de la ventana. */
export function totalTaskCount(project: Counts, projectTasks: Task[]): number {
  return (project.olderDoneCount ?? 0) + projectTasks.length;
}

/** Horas de las tareas completadas, incluidas las fuera de la ventana. */
export function doneEffortHours(project: Counts, projectTasks: Task[]): number {
  return (
    (project.olderDoneEffortHours ?? 0) +
    projectTasks
      .filter((t) => t.done && t.effortHours != null)
      .reduce((acc, t) => acc + (t.effortHours as number), 0)
  );
}
