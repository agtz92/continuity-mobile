import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Sparkles, Zap } from "lucide-react-native";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import { impactFeedback, selectionFeedback } from "@/lib/feedback";
import { useThemeColors } from "@/theme/useThemeColors";
import { lift } from "@/theme/lift";

function ActionRow({
  label,
  icon,
  onPress,
  borderColor,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  borderColor: string;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-2 active:opacity-80"
    >
      <View
        className="rounded-lg bg-surface px-3 py-2"
        style={{ borderWidth: 1, borderColor, ...lift("float", c) }}
      >
        <Text className="text-sm font-sans-semibold text-text">{label}</Text>
      </View>
      <View
        className="h-12 w-12 items-center justify-center rounded-full bg-accent"
        style={lift("float", c)}
      >
        {icon}
      </View>
    </Pressable>
  );
}

/**
 * Floating Action Button → speed-dial. Tapping it expands three labelled
 * actions: the screen's primary create action, **quick capture**, and a
 * built-in "Open Loop" (the AI assistant), so every list screen exposes both
 * from the + without any per-screen wiring. A full-screen scrim closes it. The
 * main button's icon rotates 45° when open (a + reads as ×). Absolutely
 * positioned bottom-right.
 *
 * La captura rápida vive aquí, y no en la barra de pestañas, porque el `+` ya
 * es el sitio donde se crea algo en esta app: meterla en una sexta pestaña
 * habría puesto dos botones de "crear" en la misma pantalla diciendo cosas
 * distintas.
 */
export function FAB({
  icon,
  onPress,
  label,
  bottomOffset = 20,
}: {
  icon: ReactNode;
  onPress: () => void;
  /** Accessible label + speed-dial label for the primary action. */
  label: string;
  bottomOffset?: number;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const toggle = () => {
    if (open) {
      selectionFeedback();
      setOpen(false);
    } else {
      impactFeedback("light");
      setOpen(true);
    }
  };

  const runPrimary = () => {
    selectionFeedback();
    setOpen(false);
    onPress();
  };

  const openLoop = () => {
    selectionFeedback();
    setOpen(false);
    router.push("/assistant");
  };

  const openCapture = () => {
    selectionFeedback();
    setOpen(false);
    setCapturing(true);
  };

  return (
    <>
      {open && (
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel={t("common.cancel")}
          className="absolute bottom-0 left-0 right-0 top-0"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        />
      )}

      <View
        className="absolute right-4 items-end gap-3"
        style={{ bottom: bottomOffset }}
        pointerEvents="box-none"
      >
        {open && (
          <View className="items-end gap-3">
            <ActionRow
              label={t("assistant.buttonLabel")}
              icon={<Sparkles size={22} color={c.bg} />}
              onPress={openLoop}
              borderColor={c.border}
            />
            <ActionRow
              label={t("capture.title")}
              icon={<Zap size={22} color={c.bg} />}
              onPress={openCapture}
              borderColor={c.border}
            />
            <ActionRow
              label={label}
              icon={icon}
              onPress={runPrimary}
              borderColor={c.border}
            />
          </View>
        )}

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={open ? t("common.cancel") : label}
          accessibilityState={{ expanded: open }}
          className="h-14 w-14 items-center justify-center rounded-full bg-accent active:opacity-90"
          style={lift("float", c)}
        >
          <View style={{ transform: [{ rotate: open ? "45deg" : "0deg" }] }}>
            {icon}
          </View>
        </Pressable>
      </View>

      <CaptureSheet visible={capturing} onClose={() => setCapturing(false)} />
    </>
  );
}
