import { useState } from "react";

import type { Project } from "@/lib/types";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import {
  StalledProjectModal,
  type StalledChoice,
} from "@/components/projects/StalledProjectModal";
import { PauseProjectModal, type PauseNotes } from "@/components/projects/PauseProjectModal";
import { KillProjectModal, type KillNotes } from "@/components/projects/KillProjectModal";

/**
 * Cola de decisión de proyectos stalled: un modal por proyecto, en orden. Los
 * que el usuario ya resolvió (o saltó) en esta sesión no vuelven hasta recargar.
 * "active" resuelve de inmediato; "pause"/"kill" abren su modal de notas, que
 * resuelve recién al guardar.
 */
export function StalledQueue({ stalled }: { stalled: Project[] }) {
  const closure = useProjectClosure();
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [pauseOpen, setPauseOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);

  const current = stalled.find((p) => !resolved.has(p.id)) ?? null;
  const markResolved = (id: string) => setResolved((prev) => new Set(prev).add(id));

  const onChoice = (choice: StalledChoice) => {
    if (!current) return;
    if (choice === "active") {
      void closure.setStatus(current, "active");
      markResolved(current.id);
    } else if (choice === "pause") {
      setPauseOpen(true);
    } else {
      setKillOpen(true);
    }
  };

  const onPause = async (notes: PauseNotes) => {
    if (!current) return;
    if (await closure.pause(current, notes)) {
      setPauseOpen(false);
      markResolved(current.id);
    }
  };

  const onKill = async (notes: KillNotes) => {
    if (!current) return;
    if (await closure.kill(current, notes)) {
      setKillOpen(false);
      markResolved(current.id);
    }
  };

  return (
    <>
      {/* La `key` por id remonta el modal entre proyectos para resetear su estado. */}
      <StalledProjectModal
        key={current?.id ?? "none"}
        visible={current !== null && !pauseOpen && !killOpen}
        project={current}
        saving={closure.saving}
        onResolve={onChoice}
      />
      <PauseProjectModal
        visible={pauseOpen}
        projectName={current?.name ?? ""}
        saving={closure.saving}
        onCancel={() => setPauseOpen(false)}
        onConfirm={onPause}
      />
      <KillProjectModal
        visible={killOpen}
        projectName={current?.name ?? ""}
        saving={closure.saving}
        onCancel={() => setKillOpen(false)}
        onConfirm={onKill}
      />
    </>
  );
}
