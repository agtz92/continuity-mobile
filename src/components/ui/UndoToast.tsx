import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { runUndo, setUndoLongTtl, subscribeUndo } from "@/lib/toast";
import { selectionFeedback } from "@/lib/feedback";
import { useThemeColors } from "@/theme/useThemeColors";

import { TAB_BAR_EXTRA_BOTTOM, TAB_BAR_HEIGHT } from "@/lib/tabBar";

const TAB_BAR = TAB_BAR_HEIGHT + TAB_BAR_EXTRA_BOTTOM;

const enter = FadeInDown.duration(160)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
const leave = FadeOut.duration(160);

/**
 * Toast "Deshacer" (handoff del cue "Trazo"). No confirma —eso ya lo hicieron
 * el haptic y el cue bajo el dedo—: solo ofrece revertir una fila que salió de
 * la lista. Un solo toast que cuenta ("3 hechas"), 8 px sobre las pestañas,
 * sin sombra y sin acento (sobre `toastBg` en `light` no pasa AA).
 */
export function UndoToast() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const prev = useRef(0);

  useEffect(() => subscribeUndo(setCount), []);

  // Con lector de pantalla el toast dura el doble.
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setUndoLongTtl);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setUndoLongTtl);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (count > prev.current) {
      AccessibilityInfo.announceForAccessibility(t("taskRow.undoAnnounce"));
    }
    prev.current = count;
  }, [count, t]);

  if (count === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + TAB_BAR + 8,
        alignItems: "center",
        zIndex: 60,
      }}
    >
      <Animated.View
        entering={enter}
        exiting={leave}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 44,
          borderRadius: 10,
          paddingLeft: 16,
          paddingRight: 4,
          borderWidth: 1,
          borderColor: c.line[14],
          backgroundColor: c.toastBg,
        }}
      >
        <Text
          className="font-sans"
          style={{ fontSize: 15, color: c.toastText, fontVariant: ["tabular-nums"] }}
        >
          {t("taskRow.undoToast", { count })}
        </Text>
        <Pressable
          onPress={() => {
            selectionFeedback();
            runUndo();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("taskRow.undo")}
          className="active:opacity-60"
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: "center" }}
        >
          <Text
            className="font-sans-semibold"
            style={{
              fontSize: 15,
              color: c.toastText,
              textDecorationLine: "underline",
            }}
          >
            {t("taskRow.undo")}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
