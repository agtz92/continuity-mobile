import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pin, PinOff, Plus, Trash2 } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { CategorySelect } from "@/components/ui/CategorySelect";
import { Field } from "@/components/ui/Field";
import { IconAction } from "@/components/ui/IconAction";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SheetRow } from "@/components/more/SheetRow";
import { NoteSectionCard } from "@/components/notes/NoteSectionCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useQuickNoteMutations } from "@/hooks/useQuickNoteMutations";
import { impactFeedback, selectionFeedback } from "@/lib/feedback";
import type { NoteSection } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export default function QuickNoteEditor() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories, projects } = useDashboardData();
  const { quickNotes } = useQuickNotes();
  const m = useQuickNoteMutations();

  const note = id ? quickNotes.find((n) => n.id === id) ?? null : null;
  const [title, setTitle] = useState(note?.title ?? "");
  const [menu, setMenu] = useState(false);
  const pendingDelete = useRef(false);

  // Re-siembra el título cuando cambia el id resuelto (la nota llega después
  // del montaje). Estable mientras escribes: nunca pisa ediciones.
  useEffect(() => {
    if (note) setTitle(note.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const pinned = note?.pinned ?? false;
  const togglePin = useCallback(() => {
    if (!note) return;
    impactFeedback("medium");
    void m.setPinned(note.id, !note.pinned);
  }, [note, m]);

  // Fijar y ⋯ viven en la cabecera nativa, a 44 px.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        note ? (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <IconAction
              icon={pinned ? PinOff : Pin}
              tone={pinned ? "accent" : "muted"}
              label={pinned ? t("views.quickNotes.unpin") : t("views.quickNotes.pin")}
              onPress={togglePin}
            />
            <IconAction
              icon={MoreHorizontal}
              label={t("views.quickNotes.noteMenu")}
              onPress={() => setMenu(true)}
            />
          </View>
        ) : null,
    });
  }, [navigation, note, pinned, togglePin, t]);

  if (!note) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg" edges={["bottom"]}>
        <Text className="font-sans text-base text-text-3">…</Text>
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

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const i = ids.indexOf(sectionId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    selectionFeedback();
    void m.reorderSections(note.id, ids);
  };

  const onMenuClosed = async () => {
    if (!pendingDelete.current) return;
    pendingDelete.current = false;
    if (await m.deleteNote({ ...note, title })) router.back();
  };

  const renderSection = ({ item, drag, isActive, getIndex }: RenderItemParams<NoteSection>) => {
    const index = getIndex() ?? 0;
    return (
      <View style={{ marginBottom: 10 }}>
        <NoteSectionCard
          section={item}
          onSave={(data) => m.updateSection(item.id, data)}
          onDelete={(draft) => m.deleteSection(item.id, draft)}
          onDrag={drag}
          isActive={isActive}
          onMove={(dir) => moveSection(item.id, dir)}
          canMoveUp={index > 0}
          canMoveDown={index < sections.length - 1}
        />
      </View>
    );
  };

  const header = (
    <View style={{ gap: 20, marginBottom: 20 }}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={() => saveMeta({})}
        placeholder={t("views.quickNotes.titlePlaceholder")}
        placeholderTextColor={c.text5}
        multiline
        blurOnSubmit
        accessibilityLabel={t("views.quickNotes.titlePlaceholder")}
        className="font-display"
        style={{ color: c.text, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, padding: 0 }}
      />

      {/* Categoría y proyecto lado a lado: dos campos iguales. */}
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Field label={t("views.quickNotes.category")}>
            <CategorySelect
              categories={categories}
              value={note.categoryId}
              onChange={(categoryId: string | null) => saveMeta({ categoryId })}
            />
          </Field>
        </View>
        <View className="flex-1">
          <Field label={t("views.quickNotes.project")}>
            <ProjectSelect
              projects={projects}
              value={note.projectId}
              onChange={(pid) => saveMeta({ projectId: pid })}
            />
          </Field>
        </View>
      </View>
    </View>
  );

  const footer = (
    <Pressable
      onPress={() => m.addSection(note.id)}
      accessibilityRole="button"
      className="flex-row items-center justify-center rounded-xl border border-dashed active:opacity-70"
      style={{ minHeight: SIZE.button, gap: 8, marginTop: 4, borderColor: c.line[22] }}
    >
      <Plus size={18} color={c.text3} />
      <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text3 }}>
        {t("views.quickNotes.addSectionShort")}
      </Text>
    </Pressable>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-bg">
      <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <DraggableFlatList
            data={sections}
            keyExtractor={(s) => s.id}
            renderItem={renderSection}
            onDragEnd={({ data }) => {
              selectionFeedback();
              void m.reorderSections(
                note.id,
                data.map((s) => s.id),
              );
            }}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            contentContainerStyle={{
              paddingHorizontal: SIZE.gutter,
              paddingTop: 12,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={menu}
        onClose={() => setMenu(false)}
        onClosed={() => void onMenuClosed()}
        title={title.trim() || t("views.quickNotes.untitled")}
      >
        <SheetRow
          icon={pinned ? PinOff : Pin}
          label={pinned ? t("views.quickNotes.unpin") : t("views.quickNotes.pin")}
          onPress={() => {
            setMenu(false);
            togglePin();
          }}
        />
        <SheetRow
          icon={Trash2}
          tone="signal"
          label={t("views.quickNotes.deleteNoteConfirmCta")}
          onPress={() => {
            pendingDelete.current = true;
            setMenu(false);
          }}
        />
      </BottomSheet>
    </GestureHandlerRootView>
  );
}
