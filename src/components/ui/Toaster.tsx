import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";
import { subscribeToasts, toast as toastApi, type Toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const RED = "rgb(248,113,113)";
const RED_BORDER = "rgba(239,68,68,0.6)";

export function Toaster() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  const tint = (kind: Toast["kind"]) =>
    kind === "error" ? RED : kind === "success" ? c.accent : c.accent2;
  const border = (kind: Toast["kind"]) =>
    kind === "error" ? RED_BORDER : alpha(tint(kind), 0.6);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        zIndex: 60,
        gap: 8,
      }}
    >
      {toasts.map((tt) => {
        const color = tint(tt.kind);
        return (
          <View
            key={tt.id}
            className="flex-row items-start gap-2 rounded-lg border bg-surface px-3 py-2.5"
            style={{ borderColor: border(tt.kind), elevation: 6 }}
          >
            <View style={{ marginTop: 1 }}>
              {tt.kind === "error" ? (
                <AlertCircle size={18} color={color} />
              ) : tt.kind === "success" ? (
                <CheckCircle2 size={18} color={color} />
              ) : (
                <Info size={18} color={color} />
              )}
            </View>
            <Text className="flex-1 text-sm leading-snug text-text">
              {tt.message}
            </Text>
            <Pressable
              onPress={() => toastApi.dismiss(tt.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <X size={14} color={c.textMuted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
