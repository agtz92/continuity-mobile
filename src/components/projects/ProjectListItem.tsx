import { memo, useCallback } from "react";
import type { Category, Project, Task } from "@/lib/types";
import { ProjectCardCompact } from "./ProjectCardCompact";

const NO_TASKS: Task[] = [];

/**
 * Renglón de la lista de Proyectos (1e). Envuelve a `ProjectCardCompact` con
 * callbacks estables: la pantalla pasa `onOpen(id)` una sola vez y aquí se ata
 * al proyecto, así el `memo` de la fila sobrevive a cada render de la lista.
 */
export const ProjectListItem = memo(function ProjectListItem({
  project,
  projectTasks,
  categoryById,
  totalEffortHours,
  onOpen,
  drag,
  dragging = false,
}: {
  project: Project;
  projectTasks: Task[] | undefined;
  categoryById: Record<string, Category>;
  totalEffortHours?: number;
  onOpen: (id: string) => void;
  /** Presente solo cuando la lista se puede reordenar ("My order" sin filtros). */
  drag?: () => void;
  dragging?: boolean;
}) {
  const onPress = useCallback(() => onOpen(project.id), [onOpen, project.id]);
  return (
    <ProjectCardCompact
      project={project}
      projectTasks={projectTasks ?? NO_TASKS}
      variant={project.status === "launched" ? "launched" : "active"}
      categoryById={categoryById}
      totalEffortHours={totalEffortHours}
      onPress={onPress}
      onLongPress={drag}
      showGrip={!!drag}
      dragging={dragging}
    />
  );
});
