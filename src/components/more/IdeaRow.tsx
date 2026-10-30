import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Rocket } from "lucide-react-native";

import { IconAction } from "@/components/ui/IconAction";
import { Meta } from "@/components/ui/Meta";
import { RuledRow } from "@/components/ui/RuledRow";
import { daysSince } from "@/lib/date";
import type { Idea } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Fila de idea (3a): título 20 px, "→ why", y una sola acción visible —
 * **Promote** (40 px). Editar y borrar viven bajo ⋯ (hoja), para que el botón
 * que importa no compita con dos vecinos del mismo peso.
 */
export const IdeaRow = memo(function IdeaRow({
  idea,
  onPromote,
  onMore,
  last,
}: {
  idea: Idea;
  onPromote: (id: string) => void;
  onMore: (idea: Idea) => void;
  last?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const days = daysSince(idea.created);
  return (
    // Espina hueca `line14`: una idea está presente pero aún no es compromiso.
    <RuledRow spine={c.line[14]} last={last}>
      <Text
        className="font-display"
        style={{ fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: c.text }}
      >
        {idea.title}
      </Text>
      {idea.why ? (
        <Text className="font-sans mt-1" style={{ fontSize: 15, lineHeight: 21, color: c.text3 }}>
          → {idea.why}
        </Text>
      ) : null}
      {idea.description ? (
        <Text
          numberOfLines={2}
          className="font-sans mt-1"
          style={{ fontSize: 15, lineHeight: 21, color: c.text3 }}
        >
          {idea.description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row items-center" style={{ gap: 12 }}>
        <Pressable
          onPress={() => onPromote(idea.id)}
          accessibilityRole="button"
          accessibilityLabel={`${t("views.ideas.promote")}: ${idea.title}`}
          className="flex-row items-center rounded-md active:opacity-80"
          style={{ height: SIZE.chip, paddingHorizontal: 14, gap: 8, backgroundColor: c.accent }}
        >
          <Rocket size={16} color={c.bg} />
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.bg }}>
            {t("views.ideas.promoteShort")}
          </Text>
        </Pressable>
        <Meta variant="cintillo" tone="faint" className="flex-1">
          {days != null ? t("views.ideas.ageMeta", { days }) : t("views.ideas.ideaLabel")}
        </Meta>
        <IconAction
          icon={MoreHorizontal}
          label={t("views.ideas.moreActions", { title: idea.title })}
          onPress={() => onMore(idea)}
        />
      </View>
    </RuledRow>
  );
});
