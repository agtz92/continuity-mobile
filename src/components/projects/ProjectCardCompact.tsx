import { Pressable, Text, View } from "react-native";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { Clock, Rocket, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Category, Project, Task } from "@/lib/types";
import { isDueToday, isOverdue } from "@/lib/date";
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import { Spine, spineStrikesTitle } from "@/components/ui/Spine";
import { ProgressTicks } from "@/components/ui/ProgressTicks";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Meta } from "@/components/ui/Meta";
import { touchInk } from "@/components/today/todayColors";
import {
  projectBlockedDays,
  projectDays,
  projectIsBlocked,
  taskIsBlocked,
} from "@/lib/cooling";


/**
 * Tarjeta compacta de proyecto. Espejo de la web: es la tarjeta de las rejillas
 * de Hoy y también el renglón de la pantalla de Proyectos.
 *
 * Rediseño:
 *
 * - **La espina sustituye al punto de prioridad.** El punto solo decía
 *   prioridad; la espina dice estado *y* prioridad, con la misma precedencia
 *   que en toda la app (`components/ui/Spine`), y ocupa el alto entero de la
 *   tarjeta en vez de 10px sueltos junto al título.
 * - **El progreso son bloques contables**, no una barra proporcional: cada
 *   marca es una tarea. Una barra al 62% no dice si faltan tres o treinta.
 * - **El "hace Xd" ya no es ámbar a los 7 días**: el enfriamiento se dice con
 *   el peso de la tinta (`touchInk`), que es la misma rampa que usa el punto
 *   de proyecto dormido en Hoy.
 */
export function ProjectCardCompact({
  project: p,
  projectTasks,
  variant,
  categoryById,
  totalEffortHours,
  todayEffortHours,
  comebackGapDays,
  onPress,
}: {
  project: Project;
  projectTasks: Task[];
  variant: "active" | "launched";
  categoryById: Record<string, Category>;
  totalEffortHours?: number;
  todayEffortHours?: number;
  comebackGapDays?: number | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const done = projectTasks.filter((tk) => tk.done).length;
  const total = projectTasks.length;
  const todayCount = projectTasks.filter(
    (tk) => !tk.done && isDueToday(tk.dueDate)
  ).length;
  const overdueCount = projectTasks.filter(
    (tk) => !tk.done && isOverdue(tk.dueDate)
  ).length;
  const openCount = projectTasks.filter((tk) => !tk.done).length;
  const blockedPending = projectTasks.filter(
    (tk) => !tk.done && taskIsBlocked(tk)
  );
  const blockedCount = blockedPending.length;
  const blocked = projectIsBlocked(p, blockedCount);
  const blockerReason =
    blockedPending[0]?.blockedReason ||
    blockedPending[0]?.blockers?.[0]?.externalDescription ||
    undefined;
  const days = projectDays(p);

  const borderColor =
    overdueCount > 0
      ? alpha(c.signal, 0.4)
      : todayCount > 0
      ? alpha(c.accent, 0.4)
      : variant === "launched"
      ? alpha(c.closed, 0.2)
      : c.border;
  const backgroundColor =
    variant === "launched" ? alpha(c.closed, 0.05) : c.surface;

  const cat = p.categoryId ? categoryById[p.categoryId] : undefined;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row overflow-hidden rounded-lg border active:opacity-90"
      style={{ borderColor, backgroundColor }}
    >
      <Spine status={p.status} priority={p.priority} blocked={blocked} />
      <View className="flex-1 p-4">
      <View className="mb-1 flex-row flex-wrap items-center gap-2">
        {variant === "launched" && <Rocket size={14} color={c.closed} />}
        <Text
          numberOfLines={1}
          className="text-base flex-1 font-display text-text"
          style={
            spineStrikesTitle(p.status)
              ? { textDecorationLine: "line-through" }
              : undefined
          }
        >
          {p.name}
        </Text>
        {blocked && <BlockerBadge compact label since={projectBlockedDays(p)} />}
        {comebackGapDays != null && comebackGapDays > 0 && (
          <View
            className="flex-row items-center gap-1 rounded-md border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.accent, 0.2),
              borderColor: alpha(c.accent, 0.4),
            }}
          >
            <Sparkles size={10} color={c.accent} />
            <Text className="font-sans text-xs text-accent">
              {t("projectCard.comebackBadge", { days: comebackGapDays })}
            </Text>
          </View>
        )}
        {variant === "launched" && (
          <View
            className="rounded-md border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.closed, 0.2),
              borderColor: alpha(c.closed, 0.4),
            }}
          >
            <Text className="font-sans text-xs" style={{ color: c.closed }}>
              {t("projectCard.openCount", { count: openCount })}
            </Text>
          </View>
        )}
        {overdueCount > 0 && (
          <View
            className="rounded-md border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.signal, 0.2),
              borderColor: alpha(c.signal, 0.4),
            }}
          >
            <Text className="font-sans text-xs" style={{ color: c.signal }}>
              {t("projectCard.overdueBadge", { count: overdueCount })}
            </Text>
          </View>
        )}
        {todayCount > 0 && (
          <View
            className="rounded-md border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.accent, 0.2),
              borderColor: alpha(c.accent, 0.4),
            }}
          >
            <Text className="font-sans text-xs" style={{ color: c.accent }}>
              {t("projectCard.todayBadge", { count: todayCount })}
            </Text>
          </View>
        )}
      </View>

      {cat && (
        <View className="mb-2 self-start">
          <CategoryTag name={cat.name} color={cat.color} />
        </View>
      )}

      {!!p.nextStep && (
        <Text numberOfLines={2} className="font-sans mb-3 text-sm text-text-muted">
          → {p.nextStep}
        </Text>
      )}

      {total > 0 && (
        <View className="mb-2">
          <ProgressTicks done={done} total={total} blocked={blockedCount} />
        </View>
      )}

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          {todayEffortHours != null && todayEffortHours > 0 && (
            <View
              className="flex-row items-center gap-1 rounded-md border px-1.5 py-0.5"
              style={{
                backgroundColor: alpha(c.accent, 0.15),
                borderColor: alpha(c.accent, 0.3),
              }}
            >
              <Clock size={10} color={c.accent} />
              <Text className="font-sans text-xs text-accent">
                {t("projectCard.todayHoursLabel", { hours: todayEffortHours })}
              </Text>
            </View>
          )}
          {totalEffortHours != null && totalEffortHours > 0 && (
            <View className="flex-row items-center gap-1">
              <Clock size={10} color={c.textMuted} />
              <Text className="font-sans text-xs text-text-muted">
                {t("projectCard.totalHoursLabel", { hours: totalEffortHours })}
              </Text>
            </View>
          )}
        </View>
        {variant === "active" && (
          <Meta tone="inherit" style={{ color: touchInk(days, c) }}>
            {t("projectCard.daysAgo", { days })}
          </Meta>
        )}
      </View>
      </View>
    </Pressable>
  );
}
