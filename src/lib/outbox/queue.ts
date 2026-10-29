import { AppState, type NativeEventSubscription } from "react-native";
import { File, Paths } from "expo-file-system";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { apolloCache, apolloClient } from "@/lib/apollo";
import { isOnline, onReconnect } from "@/lib/network";
import { OPS, newId, type OpKind } from "./ops";

/**
 * La cola de cambios ("outbox"): lo que el usuario hace sin red se pinta ya y
 * se manda al servidor cuando se pueda, en orden y de uno en uno.
 *
 * - **Persistida** en `outbox-<userId>.json` en cuanto entra una operación, así
 *   que cerrar la app a la fuerza no la pierde. Se borra al cerrar sesión.
 * - **Reintentos sin duplicar:** los creates llevan id propio y `setTaskDone`
 *   es idempotente, así que reenviar algo que ya entró no hace daño.
 * - **Errores:** red/5xx/`DB_UNAVAILABLE` → la operación se queda y se
 *   reintenta (al volver la red, al volver a primer plano o con backoff). Un
 *   error del servidor (validación, cupo, no existe) la descarta: reintentarla
 *   daría lo mismo. El `errorLink` ya muestra el mensaje y el refetch del
 *   final quita de la caché lo que no entró.
 * - **Online se siente igual que antes:** `submit` espera a que el servidor
 *   conteste antes de resolver, así un formulario que falla se queda abierto.
 *   Sin red resuelve `true` en cuanto la operación quedó guardada.
 *
 * Plan: `continuity/docs/plan-offline-movil.md` (fase 2).
 */

export interface OutboxOp {
  opId: string;
  kind: OpKind;
  variables: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

const PREFIX = "outbox-";
const RETRY_BASE_MS = 15_000;
const RETRY_MAX_MS = 5 * 60_000;

let userId: string | null = null;
let queue: OutboxOp[] = [];
let flushing = false;
let inFlight: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let cleanup: Array<() => void> = [];

const waiters = new Map<string, (ok: boolean) => void>();
const listeners = new Set<() => void>();

function fileFor(uid: string): File {
  return new File(Paths.document, `${PREFIX}${uid}.json`);
}

function persist(): void {
  if (!userId) return;
  try {
    const file = fileFor(userId);
    if (!file.exists) file.create();
    file.write(JSON.stringify(queue));
  } catch {
    /* sin disco: la cola sigue en memoria */
  }
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

function settle(opId: string, ok: boolean): void {
  waiters.get(opId)?.(ok);
  waiters.delete(opId);
}

export function pendingCount(): number {
  return queue.length;
}

export function subscribePending(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---- Arranque y limpieza ---------------------------------------------------

export async function startOutbox(uid: string): Promise<void> {
  if (userId === uid) return;
  stopOutbox();
  userId = uid;
  try {
    const file = fileFor(uid);
    queue = file.exists ? (JSON.parse(await file.text()) as OutboxOp[]) : [];
  } catch {
    queue = [];
  }
  notify();

  const app: NativeEventSubscription = AppState.addEventListener("change", (s) => {
    if (s === "active") void flushOutbox();
  });
  cleanup = [onReconnect(() => void flushOutbox()), () => app.remove()];
  void flushOutbox();
}

function stopOutbox(): void {
  cleanup.forEach((fn) => fn());
  cleanup = [];
  clearTimeout(retryTimer);
  retryTimer = undefined;
  // Quien esperaba ya no tiene a quién avisarle; se le dice que quedó guardado.
  waiters.forEach((resolve) => resolve(true));
  waiters.clear();
  userId = null;
  queue = [];
}

/** Cerrar sesión: tira la cola de este usuario y la de cualquiera anterior. */
export function purgeOutbox(): void {
  stopOutbox();
  notify();
  try {
    for (const entry of Paths.document.list()) {
      if (entry instanceof File && entry.name.startsWith(PREFIX)) entry.delete();
    }
  } catch {
    /* nada que borrar */
  }
}

// ---- Encolar ---------------------------------------------------------------

/**
 * Aplica el cambio en la caché, lo encola y trata de mandarlo. Resuelve `false`
 * solo si el servidor lo rechazó.
 */
export function submit(kind: OpKind, variables: Record<string, unknown>): Promise<boolean> {
  const spec = OPS[kind];
  try {
    spec.apply(apolloCache, variables);
  } catch {
    // Sin la query en caché no hay qué pintar; la operación se manda igual.
  }

  if (!userId) {
    // Sin sesión resuelta no hay dónde guardar: se manda directo, como antes.
    return apolloClient
      .mutate({ mutation: spec.mutation, variables })
      .then(() => true, () => false);
  }

  // Desmarcar una rutina que se marcó offline y aún no salió: se anulan las dos.
  if (kind === "routine.uncomplete") {
    const twin = queue.find(
      (op) =>
        op.kind === "routine.complete" &&
        op.opId !== inFlight &&
        op.variables.id === variables.id
    );
    if (twin) {
      queue = queue.filter((op) => op !== twin);
      settle(twin.opId, true);
      persist();
      notify();
      return Promise.resolve(true);
    }
  }

  const key = spec.coalesceKey?.(variables);
  if (key) {
    const stale = queue.filter(
      (op) =>
        op.opId !== inFlight &&
        op.kind === kind &&
        OPS[op.kind].coalesceKey?.(op.variables) === key
    );
    if (stale.length) {
      queue = queue.filter((op) => !stale.includes(op));
      stale.forEach((op) => settle(op.opId, true));
    }
  }

  const op: OutboxOp = {
    opId: newId(),
    kind,
    variables,
    createdAt: Date.now(),
    attempts: 0,
  };
  queue = [...queue, op];
  persist();
  notify();

  if (!isOnline()) return Promise.resolve(true);
  const result = new Promise<boolean>((resolve) => waiters.set(op.opId, resolve));
  void flushOutbox();
  return result;
}

// ---- Enviar ----------------------------------------------------------------

/** ¿Error que no se arregla reintentando? */
function isPermanent(err: unknown): boolean {
  if (CombinedGraphQLErrors.is(err)) {
    return !err.errors.some((e) => {
      const code = e.extensions?.code;
      return code === "DB_UNAVAILABLE" || code === "UNAUTHENTICATED";
    });
  }
  if (ServerError.is(err)) {
    const s = err.statusCode;
    return s >= 400 && s < 500 && s !== 401 && s !== 408 && s !== 429;
  }
  return false;
}

function scheduleRetry(attempts: number): void {
  clearTimeout(retryTimer);
  const delay = Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);
  retryTimer = setTimeout(() => void flushOutbox(), delay);
}

/**
 * Manda la cola en orden. Al vaciarla, un refetch de lo montado reconcilia lo
 * que el servidor deriva (y quita lo que rechazó).
 */
export async function flushOutbox(): Promise<void> {
  if (flushing || !userId || !isOnline() || queue.length === 0) return;
  flushing = true;
  let sent = false;
  try {
    while (queue.length > 0 && isOnline()) {
      const op = queue[0];
      inFlight = op.opId;
      try {
        await apolloClient.mutate({
          mutation: OPS[op.kind].mutation,
          variables: op.variables,
          context: { outbox: true },
        });
        queue = queue.filter((q) => q.opId !== op.opId);
        settle(op.opId, true);
        sent = true;
      } catch (err) {
        if (isPermanent(err)) {
          queue = queue.filter((q) => q.opId !== op.opId);
          settle(op.opId, false);
          sent = true;
        } else {
          op.attempts += 1;
          // Quedaron guardadas (esta y las que esperan detrás): para quien
          // espera, eso es éxito. Si no, un formulario se quedaría girando
          // hasta el siguiente reintento.
          queue.forEach((q) => settle(q.opId, true));
          persist();
          notify();
          scheduleRetry(op.attempts);
          break;
        }
      }
      persist();
      notify();
    }
  } finally {
    flushing = false;
    inFlight = null;
  }
  if (sent && queue.length === 0) {
    void apolloClient.refetchQueries({ include: "active" });
  }
}

/**
 * Lo que antes era "refetch de todo" (señales en vivo, volver a primer
 * plano): con cambios pendientes primero se mandan —el refetch los pisaría en
 * pantalla porque el servidor aún no los tiene— y el refetch va al final.
 */
export function refreshAll(): void {
  if (queue.length > 0) {
    void flushOutbox();
    return;
  }
  void apolloClient.refetchQueries({ include: "active" });
}
