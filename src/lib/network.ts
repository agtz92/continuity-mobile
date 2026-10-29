import { useSyncExternalStore } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

/**
 * ¿Hay red? Una sola suscripción a NetInfo para toda la app, legible desde
 * React (`useOnline`) y desde fuera (`isOnline`, para el errorLink de Apollo).
 *
 * "Offline" solo cuando NetInfo lo afirma: `isInternetReachable` arranca en
 * `null` mientras sondea, y tratar ese `null` como "sin red" pintaría el banner
 * un instante en cada arranque.
 */
let online = true;
const listeners = new Set<() => void>();

function compute(state: NetInfoState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

NetInfo.addEventListener((state) => {
  const next = compute(state);
  if (next === online) return;
  online = next;
  listeners.forEach((fn) => fn());
});

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isOnline(): boolean {
  return online;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline);
}

/** Avisa al volver la red (offline → online). */
export function onReconnect(fn: () => void): () => void {
  let was = online;
  return subscribe(() => {
    if (online && !was) fn();
    was = online;
  });
}
