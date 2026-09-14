import type { Href } from "expo-router";

/**
 * El guion del tour. **Esto es lo único que se edita para cambiarlo.**
 *
 * Cada paso es una fila de datos, no un componente. El overlay no sabe qué
 * dice ningún paso ni a qué apunta: lee esta lista, resuelve el texto por
 * convención (`onboarding.tour.<key>.title` / `.body`) y mide el ancla.
 *
 * Añadir una sección al tour, entero:
 *
 *   1. una entrada aquí,
 *   2. `onboarding.tour.<key>.title` y `.body` en `src/messages/en.json` y
 *      `es.json`,
 *   3. si el sitio al que apunta no es una pestaña ni una fila del menú
 *      "Más", envolverlo en `<TourAnchor id="…">`.
 *
 * No hay paso 4. Ni componentes que tocar, ni contadores que subir, ni un
 * `switch` con un caso por sección — los puntos de progreso, el numeral de la
 * ficha y los botones salen todos de `TOUR_STEPS.length`.
 *
 * Detalle largo: `docs/onboarding-tour.md`.
 */
export type TourStep = {
  /**
   * Identifica el paso y **es** su clave de i18n. Sin mapa intermedio: si el
   * texto falta, el fallo se ve en la primera pasada.
   */
  key: string;
  /**
   * Id de `TourAnchor` sobre el que se recorta el agujero. Sin ancla, el paso
   * es a pantalla completa (la bienvenida y el cierre).
   */
  anchor?: string;
  /**
   * Dónde tiene que estar la app para que el ancla exista. El overlay navega
   * antes de medir. Así el usuario ve **la sección de verdad** detrás del
   * velo, no una descripción de ella.
   */
  route?: Href;
};

/**
 * Nueve secciones en diez pasos.
 *
 * El orden no es caprichoso en su tramo de "Más": es el **orden visual de esa
 * lista**. Contarlas en otro orden obligaría al recorte a saltar hacia arriba
 * y hacia abajo por la misma pantalla, que se lee como un error.
 *
 * `log` no tiene paso propio a propósito: es la única vista que se explica
 * sola al verla. Se menciona dentro de `analytics`.
 */
export const TOUR_STEPS: TourStep[] = [
  // El saludo ocurre **sobre Today**, la pantalla en la que el usuario ya
  // está. Así entra en el tour sin gastar un paso, y el tour empieza situando
  // en vez de interrumpiendo.
  { key: "welcome", route: "/today" },
  { key: "projects", route: "/projects", anchor: "tab.projects" },
  { key: "tasks", route: "/tasks", anchor: "tab.tasks" },
  { key: "routines", route: "/routines", anchor: "tab.routines" },
  { key: "calendar", route: "/more", anchor: "more.calendar" },
  { key: "ideas", route: "/more", anchor: "more.ideas" },
  { key: "notes", route: "/more", anchor: "more.quick-notes" },
  { key: "graveyard", route: "/more", anchor: "more.graveyard" },
  { key: "analytics", route: "/more", anchor: "more.analytics" },
  { key: "close", route: "/today" },
];
