import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { Task } from "@/lib/types";
import { daysSince } from "@/lib/date";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Completar una tarea que **sigue bloqueada** es incoherente: o el bloqueo se
 * levantó y nadie lo registró, o la tarea dejó de importar. En vez de dejar un
 * blocker abierto colgando de una tarea cerrada, se pregunta cuál de las dos.
 *
 * Espejo de `frontend/src/components/tasks/BlockedTaskDialog.tsx`, incluida la
 * omisión deliberada: **no hay "cerrarla y dejar el blocker"**, que es justo el
 * estado sucio que este diálogo existe para evitar.
 *
 * El diálogo hace él mismo el trabajo de datos —retirar los blockers, o borrar
 * la tarea— y delega el completado en `onResolve`, que es el toggle normal de
 * la fila: así el camino feliz sigue siendo exactamente el de siempre.
 */
export function BlockedTaskDialog({
  task,
  visible,
  onClose,
  onResolve,
}: {
  task: Task;
  visible: boolean;
  onClose: () => void;
  /** Completar la tarea. Se llama tras retirar los blockers. */
  onResolve: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { removeTaskBlocker, deleteTask } = useTaskMutations();
  const [busy, setBusy] = useState<"resolve" | "delete" | null>(null);

  const reason =
    task.blockedReason ||
    task.blockers.find((b) => b.externalDescription)?.externalDescription ||
    undefined;
  const since =
    daysSince(
      task.blockedSince ?? [...task.blockers].map((b) => b.created).sort()[0]
    ) ?? 0;

  const handleResolve = async () => {
    setBusy("resolve");
    try {
      // Se retiran TODOS: la tarea no puede quedar medio desbloqueada.
      for (const b of task.blockers) {
        await removeTaskBlocker(b.id);
      }
      onResolve();
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      await deleteTask(task.id);
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("blockedTaskDialog.title")}
      footer={
        <View className="gap-2">
          <Pressable
            onPress={() => void handleResolve()}
            disabled={busy !== null}
            accessibilityRole="button"
            className="items-center rounded-md py-3"
            style={{ backgroundColor: c.accent, opacity: busy ? 0.6 : 1 }}
          >
            <Text className="font-sans-medium text-sm" style={{ color: c.bg }}>
              {t("blockedTaskDialog.resolve")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleDelete()}
            disabled={busy !== null}
            accessibilityRole="button"
            className="items-center rounded-md border py-3"
            style={{
              borderColor: alpha(c.signal, 0.5),
              backgroundColor: alpha(c.signal, 0.12),
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text className="font-sans-medium text-sm" style={{ color: c.signal }}>
              {t("blockedTaskDialog.delete")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            disabled={busy !== null}
            accessibilityRole="button"
            className="items-center rounded-md border border-border py-3"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            <Text className="font-sans text-sm text-text-3">
              {t("common.cancel")}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-4">
        <Text className="font-sans text-[15px] leading-6 text-text-2">
          {task.title}
        </Text>
        <BlockerBadge since={since} reason={reason} />
        <Meta variant="cintillo" tone="faint">
          {t("blockedTaskDialog.hint")}
        </Meta>
      </View>
    </BottomSheet>
  );
}
