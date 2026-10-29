import { AppState, type NativeEventSubscription } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Updates from "expo-updates";
import type { InMemoryCache, NormalizedCacheObject } from "@apollo/client";

/**
 * Caché de Apollo en disco: lo último que se vio se puede leer sin red, y el
 * arranque en frío pinta al instante aunque sí haya.
 *
 * - **Archivo, no AsyncStorage.** En Android AsyncStorage topa en ~6 MB y la
 *   cuenta más grande ya pasa de mil activities en el dashboard.
 * - **Uno por usuario** (`apollo-cache-<userId>.json`) y se borra al cerrar
 *   sesión (`purgePersistedCache`, desde `clearUserData`). Lo registra
 *   `backend/PRIVACIDAD_CAMBIOS.md`.
 * - **Versionado.** Si cambia `CACHE_VERSION` o el `runtimeVersion`, el archivo
 *   viejo se ignora: una caché con la forma de otras queries no rompe nada,
 *   pero tampoco sirve. Sube `CACHE_VERSION` cuando un cambio de queries deje
 *   inútil lo guardado.
 * - **Escritura con throttle.** Se envuelven los métodos que escriben en la
 *   caché (lo mismo que hace `apollo3-cache-persist`) y se guarda como mucho
 *   una vez por segundo, más al pasar a segundo plano.
 *
 * Plan completo: `continuity/docs/plan-offline-movil.md` (fase 1).
 */
const CACHE_VERSION = 1;
const SAVE_THROTTLE_MS = 1000;
const PREFIX = "apollo-cache-";

interface Persisted {
  version: string;
  /** Última respuesta buena del servidor (ms). La usa el banner offline. */
  syncedAt: number | null;
  data: NormalizedCacheObject;
}

function versionTag(): string {
  return `${CACHE_VERSION}:${Updates.runtimeVersion ?? "dev"}`;
}

function fileFor(userId: string): File {
  return new File(Paths.document, `${PREFIX}${userId}.json`);
}

// ---- "Datos de hace X" ----------------------------------------------------

let syncedAt: number | null = null;
const syncListeners = new Set<() => void>();

/** Lo llama el link de Apollo en cada respuesta que sí llegó del servidor. */
export function markSynced(): void {
  syncedAt = Date.now();
  syncListeners.forEach((fn) => fn());
}

export function getSyncedAt(): number | null {
  return syncedAt;
}

export function subscribeSyncedAt(fn: () => void): () => void {
  syncListeners.add(fn);
  return () => {
    syncListeners.delete(fn);
  };
}

// ---- Persistencia ---------------------------------------------------------

let active: {
  userId: string;
  cache: InMemoryCache;
  timer: ReturnType<typeof setTimeout> | undefined;
  restoreMethods: () => void;
  appState: NativeEventSubscription;
} | null = null;

function save(): void {
  if (!active) return;
  clearTimeout(active.timer);
  active.timer = undefined;
  try {
    const payload: Persisted = {
      version: versionTag(),
      syncedAt,
      data: active.cache.extract(),
    };
    const file = fileFor(active.userId);
    if (!file.exists) file.create();
    file.write(JSON.stringify(payload));
  } catch {
    // Disco lleno o similar: la app sigue funcionando, solo sin offline.
  }
}

function scheduleSave(): void {
  if (!active || active.timer) return;
  active.timer = setTimeout(save, SAVE_THROTTLE_MS);
}

/** Envuelve los métodos que escriben en la caché para agendar un guardado. */
function hookWrites(cache: InMemoryCache): () => void {
  const target = cache as unknown as Record<string, (...args: unknown[]) => unknown>;
  const names = ["write", "modify", "evict", "gc"] as const;
  const originals = names.map((name) => target[name]);
  names.forEach((name, i) => {
    const original = originals[i];
    target[name] = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      scheduleSave();
      return result;
    };
  });
  return () => {
    names.forEach((name, i) => {
      target[name] = originals[i];
    });
  };
}

function detach(): void {
  if (!active) return;
  clearTimeout(active.timer);
  active.restoreMethods();
  active.appState.remove();
  active = null;
}

/**
 * Restaura la caché del usuario y empieza a guardarla. Idempotente por
 * usuario; si cambia de usuario, suelta al anterior sin guardarlo.
 */
export async function startCachePersistence(
  cache: InMemoryCache,
  userId: string
): Promise<void> {
  if (active?.userId === userId) return;
  detach();

  try {
    const file = fileFor(userId);
    if (file.exists) {
      const parsed = JSON.parse(await file.text()) as Persisted;
      if (parsed.version === versionTag()) {
        cache.restore(parsed.data);
        syncedAt = parsed.syncedAt;
        syncListeners.forEach((fn) => fn());
      } else {
        file.delete();
      }
    }
  } catch {
    // Archivo corrupto: se arranca en limpio, como antes de existir esto.
  }

  active = {
    userId,
    cache,
    timer: undefined,
    restoreMethods: hookWrites(cache),
    appState: AppState.addEventListener("change", (state) => {
      if (state !== "active") save();
    }),
  };
}

/** Deja de guardar y borra toda caché persistida de este dispositivo. */
export function purgePersistedCache(): void {
  detach();
  syncedAt = null;
  syncListeners.forEach((fn) => fn());
  try {
    for (const entry of Paths.document.list()) {
      if (entry instanceof File && entry.name.startsWith(PREFIX)) entry.delete();
    }
  } catch {
    /* nada que borrar */
  }
}
