import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";
import { subscribeToasts, toast as toastApi, type Toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { lift } from "@/theme/lift";


export function Toaster() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  // Tres voces y ninguna más: lo que falla, lo que se cerró, y lo demás, que
  // es tinta neutra. El "info" era el segundo acento y solo añadía un color.
  const tint = (kind: Toast["kind"]) =>
    kind === "error" ? c.signal : kind === "success" ? c.closed : c.text3;
  const border = (kind: Toast["kind"]) => alpha(tint(kind), 0.6);

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
            style={{ borderColor: border(tt.kind), ...lift("float", c) }}
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
