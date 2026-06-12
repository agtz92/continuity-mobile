import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pin, Plus, Trash2 } from "lucide-react-native";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useQuickNoteMutations } from "@/hooks/useQuickNoteMutations";
import { Field } from "@/components/ui/Field";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { NoteSectionCard } from "@/components/notes/NoteSectionCard";
import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import { deleteFeedback, impactFeedback, selectionFeedback } from "@/lib/feedback";

export default function QuickNoteEditor() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories, projects } = useDashboardData();
  const { quickNotes } = useQuickNotes();
  const m = useQuickNoteMutations();

  const note = id ? quickNotes.find((n) => n.id === id) ?? null : null;
  const [title, setTitle] = useState(note?.title ?? "");

  // Re-seed the title when the resolved note id changes (covers the note
  // loading in after mount). Stable while typing, so it never clobbers edits.
  useEffect(() => {
    if (note) setTitle(note.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" edges={["bottom"]}>
        <Text className="text-base text-text-muted">…</Text>
      </SafeAreaView>
    );
  }

  const saveMeta = (patch: {
    title?: string;
    categoryId?: string | null;
    projectId?: string | null;
    pinned?: boolean;
  }) => {
    m.updateNote(note.id, {
      title,
      categoryId: note.categoryId,
      projectId: note.projectId,
      pinned: note.pinned,
      ...patch,
    });
  };

  const sections = [...note.sections].sort((a, b) => a.position - b.position);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    selectionFeedback();
    const ids = sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    m.reorderSections(note.id, ids);
  };

  const togglePin = () => {
    impactFeedback("medium");
    m.setPinned(note.id, !note.pinned);
  };

  const handleDelete = async () => {
    deleteFeedback();
    await m.deleteNote(note.id);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ gap: 14, padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title + pin/delete */}
          <View className="flex-row items-center gap-2">
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={() => saveMeta({})}
              placeholder={t("views.quickNotes.titlePlaceholder")}
              placeholderTextColor={c.textMuted}
              className="flex-1 font-bold"
              style={{ color: c.text, fontSize: 20 }}
            />
            <Pressable
              onPress={togglePin}
              hitSlop={8}
              accessibilityLabel={t("views.quickNotes.pin")}
            >
              <Pin size={18} color={note.pinned ? c.accent : c.textMuted} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              accessibilityLabel={t("common.delete")}
            >
              <Trash2 size={18} color={c.textMuted} />
            </Pressable>
          </View>

          {/* Category */}
          <Field label={t("views.quickNotes.category")}>
            <View className="flex-row flex-wrap gap-1.5">
              <Pressable
                onPress={() => saveMeta({ categoryId: null })}
                className="rounded-lg border px-3 py-1.5"
                style={{
                  backgroundColor: note.categoryId === null ? c.accent : c.surface,
                  borderColor: note.categoryId === null ? c.accent : c.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: note.categoryId === null ? c.bg : c.textMuted }}
                >
                  {t("views.quickNotes.noCategory")}
                </Text>
              </Pressable>
              {categories.map((cat) => {
                const active = note.categoryId === cat.id;
                const chip = categoryChipColors(cat.color, c);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => saveMeta({ categoryId: cat.id })}
                    className="flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5"
                    style={{
                      backgroundColor: active ? chip.bg : c.surface,
                      borderColor: active ? chip.border : c.border,
                    }}
                  >
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: chip.dot }}
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{ color: active ? chip.text : c.textMuted }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* Project */}
          <Field label={t("views.quickNotes.project")}>
            <ProjectSelect
              projects={projects}
              value={note.projectId}
              onChange={(pid) => saveMeta({ projectId: pid })}
            />
          </Field>

          {/* Sections */}
          <View className="gap-2">
            {sections.map((s, i) => (
              <NoteSectionCard
                key={s.id}
                section={s}
                onSave={(data) => m.updateSection(s.id, data)}
                onDelete={() => m.deleteSection(s.id)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < sections.length - 1}
              />
            ))}
          </View>

          <Pressable
            onPress={() => m.addSection(note.id)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3"
          >
            <Plus size={15} color={c.textMuted} />
            <Text className="text-sm text-text-muted">
              {t("views.quickNotes.addSection")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
