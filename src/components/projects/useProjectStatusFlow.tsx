import { useState } from "react";
import type { Project, ProjectStatus } from "@/lib/types";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import { countsTowardCap, usePlan } from "@/hooks/usePlan";
import { ProjectStatusSheet } from "./ProjectStatusSheet";
import { PauseProjectModal, type PauseNotes } from "./PauseProjectModal";
import { KillProjectModal, type KillNotes } from "./KillProjectModal";
import { ReviveProjectModal } from "./ReviveProjectModal";

/**
 * El flujo de cambio de estado del detalle de proyecto: la hoja de estados
 * (que abre la píldora de estado) y los tres modales de cierre/regreso
 * (Pause, Kill, Revive). Devuelve los disparadores y `element`, que la
 * pantalla monta una vez al final.
 *
 * Lo elegido en la hoja espera a que la hoja TERMINE de cerrarse: iOS no
 * presenta un `<Modal>` mientras otro se descarta, y hacerlo en el mismo tick
 * congelaba la app —sin error, con los toques bloqueados— al pasar a pausa o
 * a muerto, que son los dos que abren modal.
 */
export function useProjectStatusFlow(project: Project | undefined, projects: Project[]) {
  const closure = useProjectClosure();
  const { cap } = usePlan();
  const [statusSheet, setStatusSheet] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [reviveOpen, setReviveOpen] = useState(false);

  const activeUsed = projects.filter((p) => countsTowardCap(p.status)).length;

  const applyStatus = (next: ProjectStatus) => {
    if (!project) return;
    if (next === "paused") return setPauseOpen(true);
    if (next === "killed") return setKillOpen(true);
    // Sacar algo del cementerio no es un cambio de estado más: `ReviveProjectModal`
    // te enseña lo que escribiste al matarlo ("¿lo reintentarías?") y avisa si
    // revivirlo te pasa del cupo de proyectos activos. La hoja no lo sabe.
    if (project.status === "killed" && next !== "launched") return setReviveOpen(true);
    // `active`, `idea` y `launched` no piden notas: las guardadas se conservan.
    void closure.setStatus(project, next as "active" | "idea" | "launched");
  };

  const element = project ? (
    <>
      <ProjectStatusSheet
        visible={statusSheet}
        current={project.status}
        onClose={() => setStatusSheet(false)}
        onPick={(next) => {
          setPendingStatus(next);
          setStatusSheet(false);
        }}
        onClosed={() => {
          const next = pendingStatus;
          setPendingStatus(null);
          if (next) applyStatus(next);
        }}
      />
      <PauseProjectModal
        visible={pauseOpen}
        projectName={project.name}
        saving={closure.saving}
        onCancel={() => setPauseOpen(false)}
        onConfirm={async (n: PauseNotes) => {
          if (await closure.pause(project, n)) setPauseOpen(false);
        }}
      />
      <KillProjectModal
        visible={killOpen}
        projectName={project.name}
        saving={closure.saving}
        onCancel={() => setKillOpen(false)}
        onConfirm={async (n: KillNotes) => {
          if (await closure.kill(project, n)) setKillOpen(false);
        }}
      />
      <ReviveProjectModal
        visible={reviveOpen}
        projectName={project.name}
        wouldRestart={project.killedWouldRestart}
        activeUsed={activeUsed}
        activeCap={cap ?? undefined}
        saving={closure.saving}
        onCancel={() => setReviveOpen(false)}
        onRevive={async (target: "active" | "idea") => {
          if (await closure.setStatus(project, target)) setReviveOpen(false);
        }}
      />
    </>
  ) : null;

  return {
    closure,
    openStatusSheet: () => setStatusSheet(true),
    openKill: () => setKillOpen(true),
    element,
  };
}
