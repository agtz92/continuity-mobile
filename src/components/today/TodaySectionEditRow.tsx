import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Eye, EyeOff, GripVertical, Lock } from "lucide-react-native";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Compact "customization row" for the Today edit mode. The actual draggable
 * wiring lives in the screen (react-native-draggable-flatlist owns the
 * gesture and passes a `drag` handler in via render-item args); this row
 * just exposes the visual + the eye toggle.
 */
export function TodaySectionEditRow({
  icon,
  label,
  badge,
  hidden,
  hideable,
  isActive,
  onToggleHide,
  onLongPressDrag,
  labels,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  hidden: boolean;
  hideable: boolean;
  isActive: boolean;
  onToggleHide: () => void;
  onLongPressDrag: () => void;
  labels: { show: string; hide: string; locked: string; drag: string };
}) {
  const c = useThemeColors();
  return (
    <View
      className="flex-row items-center gap-3 rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: c.surface,
        borderColor: hidden ? alpha(c.border, 0.6) : c.border,
        borderStyle: hidden ? "dashed" : "solid",
        opacity: hidden ? 0.65 : 1,
        ...(isActive && {
          shadowColor: c.accent,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 8,
        }),
      }}
    >
      <Pressable
        onLongPress={onLongPressDrag}
        delayLongPress={150}
        accessibilityRole="button"
        accessibilityLabel={labels.drag}
        hitSlop={8}
        className="-ml-1 p-1"
      >
        <GripVertical size={18} color={c.textMuted} />
      </Pressable>

      <View>{icon}</View>

      <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-medium text-text" numberOfLines={1}>
          {label}
        </Text>
        {badge && (
          <View
            className="rounded px-1.5 py-0.5"
            style={{ backgroundColor: c.border }}
          >
            <Text className="text-[10px] uppercase tracking-wider text-text-muted">
              {badge}
            </Text>
          </View>
        )}
        {hidden && (
          <View
            className="rounded border px-1.5 py-0.5"
            style={{
              backgroundColor: "rgba(245,158,11,0.15)",
              borderColor: "rgba(245,158,11,0.3)",
            }}
          >
            <Text
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "rgb(251,191,36)" }}
            >
              {labels.hide}
            </Text>
          </View>
        )}
      </View>

      {hideable ? (
        <Pressable
          onPress={onToggleHide}
          accessibilityRole="button"
          accessibilityLabel={hidden ? labels.show : labels.hide}
          hitSlop={8}
          className="rounded-md p-1.5"
        >
          {hidden ? (
            <EyeOff size={18} color={c.textMuted} />
          ) : (
            <Eye size={18} color={c.textMuted} />
          )}
        </Pressable>
      ) : (
        <View
          accessibilityLabel={labels.locked}
          className="p-1.5"
        >
          <Lock size={16} color={c.textMuted} />
        </View>
      )}
    </View>
  );
}
