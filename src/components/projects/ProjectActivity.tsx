import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Activity } from "@/lib/types";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import { Meta } from "@/components/ui/Meta";
import { useThemeColors } from "@/theme/useThemeColors";

/** "Recent activity" del detalle de proyecto: los avances registrados. */
export function ProjectActivity({ updates }: { updates: Activity[] }) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();

  if (updates.length === 0) {
    return (
      <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
        {t("views.projects.card.noUpdates")}
      </Text>
    );
  }

  return (
    <ShowMoreList
      items={updates}
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
  );
}
