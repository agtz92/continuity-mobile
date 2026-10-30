import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FolderPlus, Lightbulb, Repeat, Target } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SIZE } from "@/theme/tokens";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type CreateRoute = "/project-form" | "/task-form" | "/routine-form" | "/idea-form";

/** Fila del selector "crear": icono en círculo + etiqueta, 56 px. */
function CreateOption({
  icon,
  tint,
  label,
  onPress,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-lg px-3 active:bg-border"
      style={{ minHeight: SIZE.row }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: tint }}
      >
        {icon}
      </View>
      <Text className="font-sans-medium text-text" style={{ fontSize: 17 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Hoja del FAB de Hoy: proyecto, tarea, rutina o idea. */
export function TodayCreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const go = (route: CreateRoute) => {
    onClose();
    router.push(route);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("views.today.createMenu.title")}>
      <View className="gap-1">
        <CreateOption
          icon={<FolderPlus size={18} color={c.accent} />}
          tint={alpha(c.accent, 0.15)}
          label={t("views.today.createMenu.project")}
          onPress={() => go("/project-form")}
        />
        <CreateOption
          icon={<Target size={18} color={c.accent} />}
          tint={alpha(c.accent, 0.15)}
          label={t("views.today.createMenu.task")}
          onPress={() => go("/task-form")}
        />
        <CreateOption
          icon={<Repeat size={18} color={c.text3} />}
          tint={alpha(c.text3, 0.15)}
          label={t("views.today.createMenu.routine")}
          onPress={() => go("/routine-form")}
        />
        <CreateOption
          icon={<Lightbulb size={18} color={c.accent} />}
          tint={alpha(c.accent, 0.15)}
          label={t("views.today.createMenu.idea")}
          onPress={() => go("/idea-form")}
        />
      </View>
    </BottomSheet>
  );
}
