import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { InfinityIcon, Zap } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { openCapture } from "@/components/capture/CaptureHost";
import { impactFeedback, selectionFeedback } from "@/lib/feedback";
import { useThemeColors } from "@/theme/useThemeColors";
import { lift } from "@/theme/lift";

const OPEN_MS = 160;

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
      className="flex-row items-center active:opacity-80"
    >
      {/* Margen en vez de `gap`: dentro de un contenedor absoluto sin ancho,
          Yoga no sumaba el `gap` al medir la fila y la etiqueta salía
          recortada por la derecha en iOS. */}
      <View
        className="rounded-lg bg-surface px-3 py-2"
        style={{ borderWidth: 1, borderColor, marginRight: 8, flexShrink: 1, ...lift("float", c) }}
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
 * distintas. La hoja es una sola para toda la app (`CaptureHost`).
 *
 * **Responde en el hilo nativo.** El toque del `+` es un `Gesture.Tap` cuyos
 * callbacks son worklets: el hundido, el giro del icono y la aparición de las
 * acciones arrancan en el hilo de UI aunque JS esté ocupado (procesando una
 * respuesta del dashboard, por ejemplo). Las acciones están siempre montadas y
 * solo se revelan; React se entera después (`runOnJS`) para el scrim, los
 * toques de las filas, el háptico y la accesibilidad.
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

  // `target` es el estado pedido (0/1); `progress` lo sigue animado.
  const target = useSharedValue(0);
  const progress = useSharedValue(0);
  const pressed = useSharedValue(0);

  const animateTo = useCallback(
    (value: 0 | 1) => {
      target.value = value;
      progress.value = withTiming(value, { duration: OPEN_MS });
    },
    [target, progress]
  );

  // Lado JS del toque: lo que no puede hacer el worklet.
  const syncOpen = useCallback((next: boolean) => {
    if (next) impactFeedback("light");
    else selectionFeedback();
    setOpen(next);
  }, []);

  const close = useCallback(() => {
    animateTo(0);
    setOpen(false);
  }, [animateTo]);

  const toggleFromJs = useCallback(() => {
    const next = target.value === 0;
    animateTo(next ? 1 : 0);
    syncOpen(next);
  }, [animateTo, syncOpen, target]);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .onBegin(() => {
          pressed.value = withTiming(1, { duration: 80 });
        })
        .onFinalize(() => {
          pressed.value = withTiming(0, { duration: 120 });
        })
        .onEnd((_e, success) => {
          if (!success) return;
          const next = target.value === 0 ? 1 : 0;
          target.value = next;
          progress.value = withTiming(next, { duration: OPEN_MS });
          runOnJS(syncOpen)(next === 1);
        }),
    [pressed, progress, syncOpen, target]
  );

  const runPrimary = () => {
    selectionFeedback();
    close();
    onPress();
  };

  const openLoop = () => {
    selectionFeedback();
    close();
    router.push("/assistant");
  };

  const startCapture = () => {
    selectionFeedback();
    close();
    openCapture();
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [12, 0]) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.92]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }, scrimStyle]}
      >
        <Pressable
          onPress={close}
          accessibilityLabel={t("common.cancel")}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        // `left` además de `right`: con ancho definido la columna no depende de
        // que Yoga mida bien el contenido (ver ActionRow). Las filas siguen
        // alineadas a la derecha y `box-none` deja pasar los toques del hueco.
        className="absolute left-4 right-4 items-end"
        style={{ bottom: bottomOffset, gap: 12 }}
        pointerEvents="box-none"
      >
        {/* Sin `className` en las vistas de Reanimated: el estilo animado va
            por `style` y las clases en un View normal (como el resto del repo). */}
        <Animated.View
          pointerEvents={open ? "box-none" : "none"}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          style={[{ alignItems: "flex-end", gap: 12 }, actionsStyle]}
        >
          <ActionRow
            label={t("assistant.buttonLabel")}
            icon={<InfinityIcon size={22} color={c.bg} />}
            onPress={openLoop}
            borderColor={c.border}
          />
          <ActionRow
            label={t("capture.title")}
            icon={<Zap size={22} color={c.bg} />}
            onPress={startCapture}
            borderColor={c.border}
          />
          <ActionRow
            label={label}
            icon={icon}
            onPress={runPrimary}
            borderColor={c.border}
          />
        </Animated.View>

        <GestureDetector gesture={tap}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel={open ? t("common.cancel") : label}
            accessibilityState={{ expanded: open }}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === "activate") toggleFromJs();
            }}
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.accent,
              },
              lift("float", c),
              buttonStyle,
            ]}
          >
            <Animated.View style={iconStyle}>{icon}</Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    </>
  );
}
