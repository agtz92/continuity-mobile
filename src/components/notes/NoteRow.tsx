import { memo } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pin } from "lucide-react-native";

import { Meta } from "@/components/ui/Meta";
import { RuledRow } from "@/components/ui/RuledRow";
import { daysSince } from "@/lib/date";
import type { QuickNote } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";

/** Primer cuerpo con texto (o, si no hay, el primer encabezado): la vista previa. */
export function notePreview(n: QuickNote): string {
  return (
    n.sections.find((s) => s.body.trim())?.body.trim() ??
    n.sections.find((s) => s.heading.trim())?.heading.trim() ??
    ""
  );
}

/**
 * Fila de nota (3b): espina del color de su categoría (neutra si va suelta),
 * título 17, vista previa a 2 líneas y meta "Categoría · Proyecto · N
 * secciones · 3 d". Fijada = chincheta a la derecha.
 */
export const NoteRow = memo(function NoteRow({
  note,
  categoryName,
  categoryColor,
  projectName,
  onOpen,
  last,
}: {
  note: QuickNote;
  categoryName: string | null;
  /** Color sólido (dot) de la categoría, o null si va suelta. */
  categoryColor: string | null;
  projectName: string | null;
  onOpen: (id: string) => void;
  last?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const title = note.title.trim() || t("views.quickNotes.untitled");
  const preview = notePreview(note);
  const days = daysSince(note.updatedAt);
  const meta = [
    categoryName ?? t("views.quickNotes.filters.loose"),
    projectName,
    t("views.quickNotes.sectionCount", { count: note.sections.length }),
    days != null ? t("views.quickNotes.ageDays", { days }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <RuledRow
      spine={categoryColor ?? c.line[22]}
      onPress={() => onOpen(note.id)}
      accessibilityLabel={title}
      last={last}
      trailing={
        note.pinned ? (
          <View accessibilityLabel={t("views.quickNotes.filters.pinned")} style={{ paddingTop: 2 }}>
            <Pin size={16} color={c.text3} />
          </View>
        ) : null
      }
    >
      <Text className="font-sans-semibold" style={{ fontSize: 17, lineHeight: 22, color: c.text }}>
        {title}
      </Text>
      {preview ? (
        <Text
          numberOfLines={2}
          className="font-sans mt-1"
          style={{ fontSize: 15, lineHeight: 21, color: c.text3 }}
        >
          {preview}
        </Text>
      ) : null}
      <Meta variant="cintillo" tone="faint" numberOfLines={1} className="mt-1.5">
        {meta}
      </Meta>
    </RuledRow>
  );
});
