import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme, useThemeVars } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

type InitialHeight = "auto" | "half" | "large";

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.6; // px/ms

/**
 * Bottom sheet built on RN's <Modal> + Animated + PanResponder (no extra native
 * deps, so it works in Expo Go). Drag the grab handle or tap the backdrop to
 * dismiss. Theme vars are re-injected at the modal root because <Modal> renders
 * in a separate host tree where the provider's vars() wouldn't reach.
 *
 * Controlled via `visible`; dismiss requests call `onClose`, and flipping
 * `visible` to false plays the slide-out before the modal unmounts.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  initialHeight = "auto",
  dismissible = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  initialHeight?: InitialHeight;
  dismissible?: boolean;
}) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const themeVars = useThemeVars();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(screenH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // Keep latest callbacks/flags reachable from the (once-created) PanResponder.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.setValue(screenH);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenH,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        dismissibleRef.current && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (!dismissibleRef.current) return;
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    }),
  ).current;

  const maxHeight = screenH * 0.9;
  const heightStyle =
    initialHeight === "auto"
      ? { maxHeight }
      : { height: screenH * (initialHeight === "half" ? 0.5 : 0.9), maxHeight };

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <View style={[StyleSheet.absoluteFill, themeVars]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.7)", opacity: backdrop },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onClose : undefined}
          />
        </Animated.View>

        <View pointerEvents="box-none" className="flex-1 justify-end">
          <Animated.View
            style={[heightStyle, { transform: [{ translateY }] }]}
            className="rounded-t-2xl border-t border-border bg-surface"
          >
            <View {...pan.panHandlers} className="items-center pb-1 pt-2">
              <View className="h-1 w-9 rounded-full bg-border" />
            </View>

            {title && (
              <View className="flex-row items-center justify-between px-4 pb-3">
                <Text className="text-lg font-semibold text-text">{title}</Text>
                <Pressable
                  onPress={onClose}
                  accessibilityLabel="Close"
                  hitSlop={8}
                >
                  <X color={s.textMuted} size={18} />
                </Pressable>
              </View>
            )}

            <ScrollView
              contentContainerClassName="px-4 pb-6"
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer && (
              <View
                className="border-t border-border bg-surface px-4 py-3"
                style={{ paddingBottom: insets.bottom + 12 }}
              >
                {footer}
              </View>
            )}
            {!footer && <View style={{ height: insets.bottom }} />}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
