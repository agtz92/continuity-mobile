import { useCallback, useEffect, useRef } from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";

/**
 * El registro de anclas del tour.
 *
 * El tour tiene que recortar un agujero encima de **algo que ya existe** — una
 * pestaña, una fila del menú "Más" — y para eso necesita saber dónde está ese
 * algo en la pantalla. No se puede calcular: la barra de pestañas cambia de
 * alto con el safe-area del aparato y la lista de "Más" se desplaza.
 *
 * Así que se mide en vivo. Cada sitio que quiera ser señalable se envuelve en
 * `<TourAnchor id="…">` y aquí queda su ref. El tour pide `measureAnchor(id)`
 * cuando le toca y se olvida del resto.
 *
 * Lo importante de este archivo es lo que **no** hace: no sabe qué pasos hay,
 * ni en qué orden, ni qué dicen. Añadir una sección nueva al tour no lo toca.
 */

export type Rect = { x: number; y: number; width: number; height: number };

const anchors = new Map<string, React.RefObject<View | null>>();

/** Registra una ancla. Devuelve la función de baja, para el cleanup del efecto. */
function register(id: string, ref: React.RefObject<View | null>): () => void {
  anchors.set(id, ref);
  return () => {
    // Solo se borra si sigue siendo la misma ref: dos pantallas montadas a la
    // vez (la de salida y la de entrada de una transición) comparten id un
    // instante, y la que se desmonta no debe llevarse la buena.
    if (anchors.get(id) === ref) anchors.delete(id);
  };
}

/**
 * Ata una `View` al registro. Devuelve lo que hay que esparcir en ella.
 *
 * `collapsable={false}` es obligatorio: sin él, Android funde las vistas que
 * "no hacen nada" con su padre y `measureInWindow` deja de existir.
 */
export function useTourAnchor(id: string) {
  const ref = useRef<View | null>(null);
  useEffect(() => register(id, ref), [id]);
  return { ref, collapsable: false } as const;
}

/**
 * Mide un ancla. `null` si no está montada o si todavía no tiene tamaño —
 * las dos cosas pasan durante una transición de pantalla, y las dos se
 * resuelven reintentando, que es lo que hace el overlay.
 */
export function measureAnchor(id: string): Promise<Rect | null> {
  const node = anchors.get(id)?.current;
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    // measureInWindow no garantiza llamar al callback si la vista se va del
    // árbol entre medias. Sin este plazo, el tour se quedaría esperando.
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 400);
    node.measureInWindow((x, y, width, height) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(width || height ? { x, y, width, height } : null);
    });
  });
}

// ── Desplazamiento ──────────────────────────────────────────────────────────
//
// Una fila del menú "Más" puede estar bajo el pliegue. El tour no sabe qué
// lista la contiene ni cuánto lleva desplazada; solo sabe, tras medir, que le
// falta o le sobra `dy` para tenerla a la vista. Quien tenga el ScrollView
// responde a esa petición y punto.

let scrollBy: ((dy: number) => void) | null = null;

/**
 * Props para el `ScrollView` de una pantalla que el tour puede necesitar
 * desplazar. Se esparcen y ya: `<ScrollView {...useTourScroller()}>`.
 */
export function useTourScroller() {
  const ref = useRef<ScrollView | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    const fn = (dy: number) => {
      ref.current?.scrollTo({ y: Math.max(0, offset.current + dy), animated: true });
    };
    scrollBy = fn;
    return () => {
      if (scrollBy === fn) scrollBy = null;
    };
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { ref, onScroll, scrollEventThrottle: 16 } as const;
}

/** ¿Había alguien escuchando? El overlay lo usa para saber si vale esperar. */
export function tourScrollBy(dy: number): boolean {
  if (!scrollBy) return false;
  scrollBy(dy);
  return true;
}
