import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/theme/useThemeColors";
import type { Rect } from "./anchors";

/**
 * El recorte: el velo con un agujero encima de lo que se está explicando.
 *
 * En web esto es un `box-shadow: 0 0 0 9999px`. En React Native no hay nada
 * parecido, así que el agujero se hace **con cuatro vistas** de velo —arriba,
 * abajo, izquierda y derecha del objetivo— dejando el hueco real transparente.
 * Sin máscaras, sin `clip-path`, sin librería; y de regalo el objetivo sigue
 * siendo tocable si algún día hiciera falta.
 *
 * El componente no sabe qué está señalando. Recibe un rectángulo medido y lo
 * pinta. Eso es todo lo que tiene que seguir siendo cierto cuando el tour
 * crezca.
 */

/** Aire entre el borde del objetivo y el del recorte. */
const PAD = 6;
/** Duración del reacomodo entre pasos. Corta, sin rebote. */
const MS = 160;

export function Spotlight({
  rect,
  screen,
}: {
  /** `null` = velo entero, sin agujero (la bienvenida y el cierre). */
  rect: Rect | null;
  screen: { width: number; height: number };
}) {
  const c = useThemeColors();
  const reduced = useReducedMotion();

  // Cuando no hay objetivo, el agujero se colapsa en el centro con tamaño 0:
  // así el mismo juego de cuatro vistas cubre la pantalla entera y no hace
  // falta un segundo camino de render.
  const target = rect
    ? {
        x: rect.x - PAD,
        y: rect.y - PAD,
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : { x: screen.width / 2, y: screen.height / 2, w: 0, h: 0 };

  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  const w = useSharedValue(target.w);
  const h = useSharedValue(target.h);

  useEffect(() => {
    const to = (v: number) => (reduced ? v : withTiming(v, { duration: MS }));
    x.value = to(target.x);
    y.value = to(target.y);
    w.value = to(target.w);
    h.value = to(target.h);
  }, [target.x, target.y, target.w, target.h, reduced, x, y, w, h]);

  const top = useAnimatedStyle(() => ({
    left: 0,
    top: 0,
    width: screen.width,
    height: Math.max(0, y.value),
  }));
  const bottom = useAnimatedStyle(() => ({
    left: 0,
    top: y.value + h.value,
    width: screen.width,
    height: Math.max(0, screen.height - (y.value + h.value)),
  }));
  const left = useAnimatedStyle(() => ({
    left: 0,
    top: y.value,
    width: Math.max(0, x.value),
    height: Math.max(0, h.value),
  }));
  const right = useAnimatedStyle(() => ({
    left: x.value + w.value,
    top: y.value,
    width: Math.max(0, screen.width - (x.value + w.value)),
    height: Math.max(0, h.value),
  }));

  // El filete de acento alrededor del hueco. Es lo que convierte "una zona sin
  // velo" en "esto es lo que te estoy señalando".
  const ring = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    opacity: w.value > 0 ? 1 : 0,
  }));

  const veil = { position: "absolute" as const, backgroundColor: c.scrim };

  return (
    <>
      <Animated.View pointerEvents="none" style={[veil, top]} />
      <Animated.View pointerEvents="none" style={[veil, bottom]} />
      <Animated.View pointerEvents="none" style={[veil, left]} />
      <Animated.View pointerEvents="none" style={[veil, right]} />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            borderWidth: 1,
            borderColor: c.accent,
            borderRadius: 6,
          },
          ring,
        ]}
      />
    </>
  );
}

/** El mismo aire, para que el overlay coloque la ficha sin chocar con el hueco. */
export const SPOTLIGHT_PAD = PAD;
