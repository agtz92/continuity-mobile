import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";

import type { Category, Project, Task } from "@/lib/types";
import { categoryChipColors, type ThemeColors } from "@/theme/useThemeColors";
import { OVERLOAD_HOURS, type DayLoad } from "@/lib/calendar";

/** Interacciones compartidas por todas las vistas del calendario. */
export interface CalendarHandlers {
  onOpenProject: (projectId: string) => void;
  onOpenTask: (taskId: string) => void;
  onToggleTask: (task: Task) => void | Promise<void>;
  // Las rutinas no se completan desde el calendario: tocar una abre su edición
  // (se completan desde Routines/Today).
  onOpenRoutine: (routineId: string) => void;
}

/**
 * El color de un ítem en las tres vistas: la espina del bloque (Día), la barra
 * de la celda (Mes) y la espina de la fila de agenda salen de aquí, para que
 * un proyecto se vea igual en todas. Sin categoría (o sin proyecto): neutro.
 * Las rutinas usan siempre `accent` y no pasan por aquí.
 */
export function projectColor(
  project: Project | null | undefined,
  categoryById: Record<string, Category>,
  c: ThemeColors,
): string {
  const cat = project?.categoryId ? categoryById[project.categoryId] : undefined;
  return cat ? categoryChipColors(cat.color, c).dot : c.line[34];
}

/**
 * Barra de carga del Día (6 px): ancho = horas / capacidad, `accent` o `signal`
 * si se pasa, y a la derecha la palabra del nivel. El nivel se dice con texto,
 * no solo con color.
 */
export function DayLoadBar({
  load,
  colors,
  label,
}: {
  load: DayLoad;
  colors: ThemeColors;
  label: string;
}) {
  const over = load.level === "over";
  const pct = load.hours <= 0 ? 0 : Math.min(100, Math.round((load.hours / OVERLOAD_HOURS) * 100));
  return (
    <View className="flex-row items-center" style={{ gap: 12 }}>
      <View className="flex-1" style={{ height: 6, backgroundColor: colors.line[8] }}>
        <View
          style={{ height: 6, width: `${pct}%`, backgroundColor: over ? colors.signal : colors.accent }}
        />
      </View>
      <Text
        className="font-sans-semibold uppercase"
        style={{ fontSize: 12, letterSpacing: 0.8, color: over ? colors.signal : colors.text2 }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Cintillo de sección: versalitas 11/700, regla que llena y conteo a la derecha. */
export function CalendarCintillo({
  label,
  count,
  colors,
}: {
  label: string;
  count: number;
  colors: ThemeColors;
}) {
  return (
    <View className="flex-row items-center" style={{ minHeight: 44, gap: 10 }}>
      <Text
        className="font-sans-bold uppercase"
        style={{ fontSize: 11, letterSpacing: 1.5, color: colors.text }}
      >
        {label}
      </Text>
      <View className="flex-1" style={{ height: 1, backgroundColor: colors.line[14] }} />
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 12, color: colors.text3, fontVariant: ["tabular-nums"] }}
      >
        {count}
      </Text>
    </View>
  );
}

/** "Add to Thursday": botón punteado de 48 px que crea una tarea para ese día. */
export function AddToDayButton({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-center active:opacity-70"
      style={{
        height: 48,
        gap: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.line[34],
      }}
    >
      <Plus size={18} color={colors.text2} />
      <Text className="font-sans-medium" style={{ fontSize: 15, color: colors.text2 }}>
        {label}
      </Text>
    </Pressable>
  );
}
