import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { Clock, GripVertical, Rocket, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Category, Project, Task } from "@/lib/types";
import { isDueToday, isOverdue } from "@/lib/date";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
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

/** Badge de la fila de badges: versalitas 11 px, rectángulo de radio 4. */
function CardBadge({
  ink,
  fill,
  border,
  children,
}: {
  ink: string;
  fill: string;
  border: string;
  children: ReactNode;
}) {
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: fill,
        borderColor: border,
      }}
    >
      {typeof children === "string" ? (
        <Text
          className="font-sans-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 0.8, color: ink }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

/**
 * Tarjeta compacta de proyecto. Espejo de la web: es la tarjeta de las rejillas
 * de Hoy y también el renglón de la pantalla de Proyectos.
 *
 * Rediseño "Breathe" (1e):
 *
 * - **Título de 19 px que envuelve**: nunca `numberOfLines={1}`.
 * - Debajo, **categoría + "1d ago"** en una sola línea de metadato.
 * - **Badges en fila propia** (bloqueado, vencidas, hoy, abiertas), versalitas
 *   de 11 px — ya no compiten con el título por el ancho.
 * - **La espina sustituye al punto de prioridad** (estado *y* prioridad).
 * - **El progreso son bloques contables**, y las horas van a la derecha.
 * - `showGrip` pinta el ⠿ de 20 px dentro de la tarjeta (caja 40) cuando la
 *   lista se puede reordenar; el arrastre lo dispara el long-press sobre la
 *   tarjeta entera (`onLongPress`), el grip es solo la afordancia.
 */
export const ProjectCardCompact = memo(function ProjectCardCompact({
  project: p,
  projectTasks,
  variant,
  categoryById,
  totalEffortHours,
  todayEffortHours,
  comebackGapDays,
  onPress,
  onLongPress,
  showGrip = false,
  dragging = false,
}: {
  project: Project;
  projectTasks: Task[];
  variant: "active" | "launched";
  categoryById: Record<string, Category>;
  totalEffortHours?: number;
  todayEffortHours?: number;
  comebackGapDays?: number | null;
  onPress: () => void;
  /** Long-press sobre la tarjeta entera (reordenar). */
  onLongPress?: () => void;
  showGrip?: boolean;
  dragging?: boolean;
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
  const openCount = total - done;
  const blockedCount = projectTasks.filter(
    (tk) => !tk.done && taskIsBlocked(tk)
  ).length;
  const blocked = projectIsBlocked(p, blockedCount);
  const days = projectDays(p);

  const borderColor =
    blocked || overdueCount > 0
      ? alpha(c.signal, 0.4)
      : todayCount > 0
        ? alpha(c.accent, 0.4)
        : variant === "launched"
          ? alpha(c.closed, 0.2)
          : c.border;
  const backgroundColor =
    variant === "launched" ? alpha(c.closed, 0.05) : c.surface;

  const cat = p.categoryId ? categoryById[p.categoryId] : undefined;
  const hasComeback = comebackGapDays != null && comebackGapDays > 0;
  const showOpen = variant === "launched" && openCount > 0;
  const hasBadges =
    blocked || hasComeback || overdueCount > 0 || todayCount > 0 || showOpen;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      disabled={dragging}
      accessibilityRole="button"
      accessibilityLabel={p.name}
      accessibilityHint={showGrip ? t("views.projects.manualHint") : undefined}
      className="flex-row overflow-hidden rounded-lg border active:opacity-90"
      style={{ borderColor, backgroundColor }}
    >
      <Spine status={p.status} priority={p.priority} blocked={blocked} />
      <View className="flex-1 gap-2 p-4">
        <View className="flex-row items-start gap-2">
          {variant === "launched" ? (
            <View style={{ paddingTop: 4 }}>
              <Rocket size={15} color={c.closed} />
            </View>
          ) : null}
          <Text
            className="flex-1 font-display text-text"
            style={{
              fontSize: 19,
              lineHeight: 23,
              letterSpacing: -0.4,
              textDecorationLine: spineStrikesTitle(p.status) ? "line-through" : "none",
            }}
          >
            {p.name}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          {cat ? <CategoryTag name={cat.name} color={cat.color} /> : null}
          {cat ? <Meta tone="faint">·</Meta> : null}
          <Meta tone="inherit" style={{ color: touchInk(days, c) }}>
            {days === 0 ? t("projectCard.touchedToday") : t("projectCard.daysAgo", { days })}
          </Meta>
        </View>

        {hasBadges ? (
          <View className="flex-row flex-wrap items-center gap-2">
            {blocked ? (
              <BlockerBadge compact label since={projectBlockedDays(p)} />
            ) : null}
            {overdueCount > 0 ? (
              <CardBadge ink={c.signal} fill={alpha(c.signal, 0.12)} border={alpha(c.signal, 0.35)}>
                {t("projectCard.overdueBadge", { count: overdueCount })}
              </CardBadge>
            ) : null}
            {todayCount > 0 ? (
              <CardBadge ink={c.accent} fill={alpha(c.accent, 0.12)} border={alpha(c.accent, 0.35)}>
                {t("projectCard.todayBadge", { count: todayCount })}
              </CardBadge>
            ) : null}
            {showOpen ? (
              <CardBadge ink={c.closed} fill={alpha(c.closed, 0.12)} border={alpha(c.closed, 0.35)}>
                {t("projectCard.openCount", { count: openCount })}
              </CardBadge>
            ) : null}
            {hasComeback ? (
              <CardBadge ink={c.accent} fill={alpha(c.accent, 0.12)} border={alpha(c.accent, 0.35)}>
                <Sparkles size={10} color={c.accent} />
                <Text
                  className="font-sans-semibold uppercase"
                  style={{ fontSize: 11, letterSpacing: 0.8, color: c.accent }}
                >
                  {t("projectCard.comebackBadge", { days: comebackGapDays })}
                </Text>
              </CardBadge>
            ) : null}
          </View>
        ) : null}

        {p.nextStep ? (
          <Text
            numberOfLines={3}
            className="font-sans"
            style={{ fontSize: 15, lineHeight: 21, color: c.text2 }}
          >
            → {p.nextStep}
          </Text>
        ) : null}

        {total > 0 ||
        (totalEffortHours != null && totalEffortHours > 0) ||
        (todayEffortHours != null && todayEffortHours > 0) ? (
          <View className="flex-row items-center gap-3 pt-1">
            <View className="min-w-0 flex-1">
              {total > 0 ? (
                <ProgressTicks done={done} total={total} blocked={blockedCount} />
              ) : null}
            </View>
            {todayEffortHours != null && todayEffortHours > 0 ? (
              <Meta tone="inherit" style={{ color: c.accent }}>
                {t("projectCard.todayHoursLabel", { hours: todayEffortHours })}
              </Meta>
            ) : null}
            {totalEffortHours != null && totalEffortHours > 0 ? (
              <View
                className="flex-row items-center gap-1"
                accessibilityLabel={t("projectCard.totalHoursLabel", { hours: totalEffortHours })}
              >
                <Clock size={12} color={c.text5} />
                <Meta tone="faint">{t("projectCard.hoursShort", { hours: totalEffortHours })}</Meta>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {showGrip ? (
        <View
          className="items-center justify-center"
          style={{ width: 40 }}
          importantForAccessibility="no"
        >
          <GripVertical size={20} color={c.text5} />
        </View>
      ) : null}
    </Pressable>
  );
});
