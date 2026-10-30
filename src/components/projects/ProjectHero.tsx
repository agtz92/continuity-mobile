import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Category, Project } from "@/lib/types";
import { priorityFill } from "@/lib/priority";
import { projectCooling, projectDays } from "@/lib/cooling";
import { Spine, spineStrikesTitle } from "@/components/ui/Spine";
import { CoolingRule } from "@/components/ui/CoolingRule";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Meta } from "@/components/ui/Meta";
import { useThemeColors } from "@/theme/useThemeColors";
import { StatusBadge } from "./StatusBadge";

/**
 * Cabecera del detalle de proyecto (1g): espina + nombre a 26 px (envuelve),
 * y debajo el estado como píldora de 36 px —tocarla abre el selector de
 * estado— con prioridad y categoría. A la derecha, los días sin tocar con su
 * regla (`CoolingRule`) y "day idle": "97 días" es la respuesta a la pregunta
 * que trae a alguien a esta pantalla dos veces.
 */
export function ProjectHero({
  project,
  category,
  blocked,
  onStatusPress,
}: {
  project: Project;
  category?: Category;
  blocked: boolean;
  onStatusPress: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const days = projectDays(project);

  return (
    <View className="flex-row items-stretch gap-3">
      <Spine status={project.status} priority={project.priority} blocked={blocked} />
      <View className="min-w-0 flex-1 gap-3">
        <View className="flex-row items-start gap-3">
          <Text
            accessibilityRole="header"
            className="min-w-0 flex-1 font-display text-text"
            style={{
              fontSize: 26,
              lineHeight: 29,
              letterSpacing: -0.9,
              textDecorationLine: spineStrikesTitle(project.status) ? "line-through" : "none",
            }}
          >
            {project.name}
          </Text>
          <View className="items-end gap-1 pt-1">
            <CoolingRule days={days} cooling={projectCooling(project)} />
            <Meta variant="cintillo" tone="muted">
              {t("views.projectDetail.daysIdle", { count: days })}
            </Meta>
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
          <StatusBadge status={project.status} size="lg" onPress={onStatusPress} />
          <View className="flex-row items-center gap-1.5">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: priorityFill(project.priority, c) }}
            />
            <Meta variant="cintillo" tone="muted">
              {t(`priority.${project.priority}`)}
            </Meta>
          </View>
          <CategoryTag name={category?.name} color={category?.color} loose={!category} />
        </View>
      </View>
    </View>
  );
}
