import { useLayoutEffect, useRef } from "react";
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { offerUndo } from "@/lib/toast";

/**
 * Línea de tiempo del cue "Trazo" al completar (handoff
 * `design_handoff_complete_cue`). Todas las pistas leen su tramo de un solo
 * reloj en ms que corre 0 → `CUE_END_MS` cuando `done` pasa a true:
 *
 * - disco del toggle 0–140 · palomita 60–220 (24 px: 0–120 · 50–190)
 * - tachado línea i: 90 + 50·min(i, 2), 180 ms (compacto: 80–240)
 * - tinta (título, espina, borde, badges) 0–220 en `ink`
 * - la fila se va a los `LEAVE_MS`; entonces entra "Deshacer"
 *
 * Desmarcar no des-dibuja: `shown` baja la opacidad en 120 ms y la tinta
 * vuelve en 160. Con Reducir movimiento todo salta al estado final.
 */
export const CUE_END_MS = 400;
export const LEAVE_MS = 380;

/** Progreso 0..1 de una pista que arranca en `start` y dura `dur` ms. */
export function span(clock: number, start: number, dur: number): number {
  "worklet";
  return Math.min(1, Math.max(0, (clock - start) / dur));
}

export function out3(p: number): number {
  "worklet";
  return 1 - (1 - p) * (1 - p) * (1 - p);
}

export function out2(p: number): number {
  "worklet";
  return 1 - (1 - p) * (1 - p);
}

const ease = Easing.out(Easing.cubic);

/**
 * Reloj del cue para un componente. Arranca en el layout effect (antes del
 * pintado), así el primer frame del cue coincide con el del haptic.
 */
export function useCue(done: boolean) {
  const reduce = useReducedMotion();
  const clock = useSharedValue(done ? CUE_END_MS : 0);
  const shown = useSharedValue(done ? 1 : 0);
  const ink = useSharedValue(done ? 1 : 0);
  const prev = useRef(done);

  useLayoutEffect(() => {
    if (prev.current === done) return;
    prev.current = done;
    if (reduce) {
      clock.value = done ? CUE_END_MS : 0;
      shown.value = done ? 1 : 0;
      ink.value = done ? 1 : 0;
      return;
    }
    if (done) {
      shown.value = 1;
      clock.value = 0;
      clock.value = withTiming(CUE_END_MS, { duration: CUE_END_MS, easing: Easing.linear });
      ink.value = withTiming(1, { duration: 220, easing: ease });
    } else {
      shown.value = withTiming(0, { duration: 120, easing: ease }, (finished) => {
        if (finished) clock.value = 0;
      });
      ink.value = withTiming(0, { duration: 160, easing: ease });
    }
  }, [done, reduce, clock, shown, ink]);

  return { clock, shown, ink };
}

/**
 * Manda el cambio cuando el cue terminó (`LEAVE_MS`): la cola escribe la
 * caché al instante y la fila saldría antes de verse. Si se pasa `undo`, entra
 * el toast "Deshacer" en el mismo momento.
 */
export function afterCue(commit: () => unknown, undo?: () => unknown): void {
  setTimeout(() => {
    void commit();
    if (undo) offerUndo(undo);
  }, LEAVE_MS);
}
