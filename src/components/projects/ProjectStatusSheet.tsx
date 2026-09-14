import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";

import type { ProjectStatus } from "@/lib/types";
import { statusConfig } from "@/lib/status";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Cambiar el estado de un proyecto, eligiendo de una lista.
 *
 * Antes la cabecera ofrecía **tres botones sueltos** — Lanzar, Pausar, Matar —
 * y el estado actual vivía aparte, en una insignia que no se podía tocar. Dos
 * problemas de eso:
 *
 * 1. **Lo destructivo estaba al mismo nivel que lo normal.** "Matar" ocupaba el
 *    mismo peso visual que "Lanzar", a un dedo de distancia.
 * 2. **"Activo" no se leía como un estado**, porque no era una opción entre
 *    otras: era una etiqueta, y las acciones eran otra cosa.
 *
 * Aquí el estado **es** el control, como en web: tocas el chip, ves los estados
 * posibles con lo que significa cada uno, y eliges. Lo destructivo queda abajo,
 * separado por una regla y con la tinta de señal.
 *
 * Dos ausencias deliberadas:
 *
 * - **`stalled` no se elige.** Lo pone el sistema solo a los 14 días sin
 *   actividad. Ofrecerlo dejaría marcar a mano algo que el servidor recalcula.
 * - **`archived` tampoco**, porque `useProjectClosure` no lo soporta todavía.
 *   Mejor no ofrecerlo que ofrecer un botón que no hace nada.
 */

/** Lo que se puede elegir, en orden de vida del proyecto. */
const SELECTABLE: ProjectStatus[] = [
  "idea",
  "active",
  "launched",
  "paused",
  "killed",
];

/** Los que piden notas antes de aplicarse. */
const NEEDS_NOTES: ProjectStatus[] = ["paused", "killed"];

export function ProjectStatusSheet({
  visible,
  current,
  onClose,
  onPick,
  onClosed,
}: {
  visible: boolean;
  current: ProjectStatus;
  onClose: () => void;
  /** El llamador decide: aplicar directo, o abrir el modal de notas. */
  onPick: (next: ProjectStatus) => void;
  /** La hoja terminó de cerrarse. Ver `BottomSheet.onClosed`. */
  onClosed?: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={t("views.projectDetail.statusSheet.title")}
    >
      <View className="gap-1">
        {SELECTABLE.map((s) => {
          const Icon = statusConfig[s].icon as React.ComponentType<{
            size?: number;
            color?: string;
          }>;
          const isCurrent = s === current;
          const destructive = s === "killed";
          const ink = destructive ? c.signal : isCurrent ? c.accent : c.text;

          return (
            <View key={s}>
              {destructive && (
                <View
                  className="my-2"
                  style={{ height: 1, backgroundColor: c.line[14] }}
                />
              )}
              <Pressable
                onPress={() => {
                  if (isCurrent) {
                    onClose();
                    return;
                  }
                  onPick(s);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                className="flex-row items-start gap-3 rounded-lg px-3 py-3 active:opacity-70"
                style={
                  isCurrent
                    ? { backgroundColor: alpha(c.accent, 0.08) }
                    : undefined
                }
              >
                <View style={{ marginTop: 2 }}>
                  <Icon size={16} color={ink} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-sans-medium text-base"
                    style={{ color: ink }}
                  >
                    {t("status." + s)}
                  </Text>
                  {/* Qué significa, no cómo se llama. Un selector de estados
                      sin explicación obliga a adivinar qué hace cada uno. */}
                  <Text className="mt-0.5 font-sans text-xs text-text-3">
                    {t("views.projectDetail.statusSheet.meaning." + s)}
                  </Text>
                  {NEEDS_NOTES.includes(s) && (
                    <Meta variant="cintillo" tone="faint" className="mt-1">
                      {t("views.projectDetail.statusSheet.asksNotes")}
                    </Meta>
                  )}
                </View>
                {isCurrent && <Check size={18} color={c.accent} />}
              </Pressable>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
