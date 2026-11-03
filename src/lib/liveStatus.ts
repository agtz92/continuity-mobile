import type { DocumentNode } from "graphql";

/**
 * ¿Está conectado el canal de señales en vivo (`useLiveSync`)?
 *
 * Con el canal arriba, cualquier escritura nuestra vuelve sola como señal
 * (trigger `notify_user_change` → `refetchQueries` de todo lo activo). Pedir
 * además el dashboard al terminar cada mutation era descargarlo dos o tres
 * veces por toque. Sin canal (error, timeout, `EXPO_PUBLIC_LIVE_UPDATES=off`)
 * se vuelve al refetch de siempre para no quedarnos con datos viejos.
 */
let connected = false;

export function setLiveConnected(value: boolean): void {
  connected = value;
}

export function isLiveConnected(): boolean {
  return connected;
}

/**
 * `refetchQueries` para una mutation: la lista dada solo si no hay canal en
 * vivo. Es función para que Apollo lo evalúe al terminar la mutation, no al
 * montar el hook.
 */
export function refetchUnlessLive(queries: DocumentNode[]) {
  return {
    refetchQueries: () => (connected ? [] : queries.map((query) => ({ query }))),
  };
}
