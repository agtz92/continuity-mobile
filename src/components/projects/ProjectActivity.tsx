import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Activity } from "@/lib/types";
import { useOlderProjectNotes } from "@/hooks/useOlderProjectNotes";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import { Meta } from "@/components/ui/Meta";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * "Recent activity" del detalle de proyecto: los avances registrados.
 *
 * El dashboard solo trae las notas de la ventana de activities; las anteriores
 * (`olderCount`, de `project.olderNoteCount`) se piden al tocar "ver
 * anteriores" y se agregan al final. Necesita red. Espejo del logbook web
 * (`frontend/src/components/projects/ProjectLogbook.tsx`).
 */
export function ProjectActivity({
  updates,
  projectId,
  olderCount = 0,
}: {
  updates: Activity[];
  projectId?: string;
  olderCount?: number;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const older = useOlderProjectNotes(projectId ?? "");

  if (updates.length === 0 && olderCount === 0) {
    return (
      <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
        {t("views.projects.card.noUpdates")}
      </Text>
    );
  }

  const recentIds = new Set(updates.map((a) => a.id));
  const items = [...updates, ...older.items.filter((a) => !recentIds.has(a.id))];
  const remaining = Math.max(0, olderCount - older.items.length);
  const canLoad = !!projectId && remaining > 0 && !older.exhausted;
  const label = older.loading
    ? t("noteHistory.loading")
    : older.error
      ? t("noteHistory.error")
      : older.started
        ? t("noteHistory.loadMore")
        : t("noteHistory.showCount", { count: remaining });

  return (
    <>
      <ShowMoreList
        items={items}
        initialCount={5}
        itemKey={(a) => a.id}
        renderItem={(a) => (
          <View className="flex-row gap-3 py-1">
            <Meta tone="faint" style={{ width: 88, paddingTop: 3 }}>
              {new Date(a.created).toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Meta>
            <Text className="font-sans flex-1" style={{ fontSize: 15, lineHeight: 21, color: c.text2 }}>
              {a.note}
            </Text>
          </View>
        )}
      />
      {canLoad && (
        <Pressable
          onPress={() => void older.load()}
          disabled={older.loading}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="self-start justify-center"
          style={{ minHeight: SIZE.hit }}
        >
          <Text className="font-sans-medium text-accent" style={{ fontSize: 15 }}>
            {label}
          </Text>
        </Pressable>
      )}
    </>
  );
}
