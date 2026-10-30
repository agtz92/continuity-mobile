import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react-native";
import type { ProjectNote } from "@/lib/types";
import { confirmAsync } from "@/lib/confirm";
import { useProjectNoteMutations } from "@/hooks/useProjectNoteMutations";
import { IconAction } from "@/components/ui/IconAction";
import { Meta } from "@/components/ui/Meta";
import { useThemeColors } from "@/theme/useThemeColors";

function firstLine(s: string): string {
  return s.split("\n", 1)[0]?.trim() ?? "";
}

function restAfterFirstLine(s: string): string {
  return s.split("\n").slice(1).join("\n").trim();
}

/** Notas del proyecto: título (o primera línea), preview de 3 líneas, borrar. */
export function ProjectNotes({ notes }: { notes: ProjectNote[] }) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const { remove } = useProjectNoteMutations();

  const relativeTime = (iso: string): string => {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return t("notes.justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("notes.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("notes.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("notes.daysAgo", { count: days });
    return new Date(iso).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDelete = async (noteId: string) => {
    if (await confirmAsync(t("notes.deleteConfirm"))) remove(noteId);
  };

  if (notes.length === 0) {
    return (
      <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
        {t("notes.empty")}
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {notes.map((n) => {
        const heading = n.title || firstLine(n.body);
        const preview = n.title ? n.body : restAfterFirstLine(n.body);
        return (
          <View
            key={n.id}
            className="rounded-lg border bg-surface py-1 pl-4 pr-1"
            style={{ borderColor: c.line[14] }}
          >
            <View className="flex-row items-start gap-2">
              <View className="min-w-0 flex-1 gap-1 py-2.5">
                <Text
                  className={heading ? "font-sans-medium" : "font-sans-medium italic"}
                  style={{ fontSize: 16, color: heading ? c.text : c.text3 }}
                >
                  {heading || t("notes.untitled")}
                </Text>
                {preview ? (
                  <Text
                    className="font-sans"
                    numberOfLines={3}
                    style={{ fontSize: 15, lineHeight: 21, color: c.text2 }}
                  >
                    {preview}
                  </Text>
                ) : null}
                <Meta variant="cintillo" tone="faint">
                  {relativeTime(n.updatedAt)}
                </Meta>
              </View>
              <IconAction
                icon={Trash2}
                label={t("common.delete")}
                onPress={() => onDelete(n.id)}
                iconSize={18}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
