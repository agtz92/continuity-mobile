import { useEffect } from "react";
import { AppState, InteractionManager } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { msSinceRefreshAll, pendingCount, refreshAll } from "@/lib/outbox";
import { isDeltaSafe, reconcileDashboard, type LiveSignal } from "@/lib/dashboardDelta";
import { msSinceOwnWrite, onOwnWrite, setLiveConnected } from "@/lib/liveStatus";

/**
 * Datos frescos sin cerrar la app. Espejo de `useLiveInvalidation` +
 * `useRefetchOnFocus` de la web.
 *
 * 1. **Señales en vivo.** Un trigger en Postgres (`notify_user_change`, backend
 *    `core/migrations/0036_live_change_signals.py` y `notifications/0015`) manda
 *    un broadcast al canal privado `user:<uuid>` cada vez que cambia una fila
 *    del usuario: la web, Claude por MCP, los syncs, los jobs o esta misma app.
 *    El aviso solo trae `{table, op}`; aquí se relanzan las queries montadas.
 * 2. **Al volver a primer plano.** iOS suspende el socket en segundo plano, así
 *    que al regresar se piden los datos una vez (mínimo 15 s entre llamadas).
 *
 * Las preferencias (tema, paleta, idioma) no se aplican desde el caché
 * reactivo (ver `ThemeProvider`): este hook avisa por `onLiveChange` y el
 * provider hace su propio refetch + aplicar.
 *
 * Interruptor: `EXPO_PUBLIC_LIVE_UPDATES=off` apaga el socket (queda el
 * refetch al volver a primer plano). El apagado de emergencia sin build nueva
 * es en el servidor: `alter table … disable trigger …`.
 */
const DEBOUNCE_MS = 400;
const FOREGROUND_MIN_GAP_MS = 15_000;
const RECENT_REFRESH_MS = 5_000;
// Eco de una escritura propia (palomear, capturar): la caché ya lo tiene, así
// que la descarga espera a que el usuario deje de tocar. Palomear cinco tareas
// seguidas cuesta una descarga al final, no cinco entre toque y toque. El tope
// evita que una racha de toques retrase sin fin un cambio que vino de fuera.
const ECHO_WINDOW_MS = 4_000;
const ECHO_DEBOUNCE_MS = 1_500;
const MAX_WAIT_MS = 5_000;

type Listener = (tables: Set<string>) => void;
const listeners = new Set<Listener>();

/** Suscribe a los avisos en vivo; recibe las tablas que cambiaron. */
export function onLiveChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useLiveSync() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const enabled = process.env.EXPO_PUBLIC_LIVE_UPDATES !== "off";

  // Señales en vivo.
  useEffect(() => {
    if (!userId || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = new Set<string>();
    let signals: LiveSignal[] = [];
    let firstPendingAt = 0;
    let cancelled = false;
    let wasDown = false;

    const isEcho = () => msSinceOwnWrite() < ECHO_WINDOW_MS;

    // Un restore o el asistente tocan decenas de filas seguidas: se juntan.
    const flush = () => {
      timer = undefined;
      firstPendingAt = 0;
      const tables = pending;
      const batch = signals;
      pending = new Set();
      signals = [];
      // Eco de lo que mandó la cola y nada más: la caché ya lo tiene y basta
      // con el delta (derivados de proyectos + activities nuevas) en vez de
      // bajar el dashboard entero. Ver `lib/dashboardDelta.ts`.
      const deltaOnly = isEcho() && isDeltaSafe(batch) && pendingCount() === 0;
      const run = () => {
        if (cancelled) return;
        if (deltaOnly) {
          void reconcileDashboard().then((ok) => {
            if (cancelled) return;
            if (!ok) refreshAll();
            listeners.forEach((fn) => fn(tables));
          });
          return;
        }
        // Con cambios offline pendientes, primero se mandan (ver `refreshAll`).
        refreshAll();
        listeners.forEach((fn) => fn(tables));
      };
      // Tras un toque propio, que la animación (cue, salida de la fila)
      // termine antes de meter la respuesta al hilo de JS.
      if (isEcho()) InteractionManager.runAfterInteractions(run);
      else run();
    };
    const schedule = () => {
      const waited = Date.now() - firstPendingAt;
      const delay = Math.min(
        isEcho() ? ECHO_DEBOUNCE_MS : DEBOUNCE_MS,
        Math.max(0, MAX_WAIT_MS - waited)
      );
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    };
    const bump = (table?: string, op?: string) => {
      if (table) {
        pending.add(table);
        signals.push({ table, op });
      } else {
        // Sin tabla (p. ej. reconexión): fuerza el camino completo.
        signals.push({ table: "", op });
      }
      if (!firstPendingAt) firstPendingAt = Date.now();
      schedule();
    };
    // Otro toque mientras esperamos: se corre la descarga para juntarlo.
    const stopOwnWrite = onOwnWrite(() => {
      if (timer) schedule();
    });

    const channel = supabase.channel(`user:${userId}`, {
      config: { private: true },
    });
    channel.on("broadcast", { event: "changed" }, (msg) => {
      const payload = msg.payload as { table?: string; op?: string } | undefined;
      bump(payload?.table, payload?.op);
    });

    // Canal privado: el join se autoriza con el JWT contra la política de
    // `realtime.messages`; sin token se rechaza.
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLiveConnected(true);
          // Al reconectar pudo haber avisos perdidos: se pide todo una vez,
          // preferencias incluidas. Salvo que acabe de correr un refreshAll:
          // al volver de segundo plano el socket se reconecta justo después
          // del refresco de primer plano, y eran dos dashboards completos por
          // cada vuelta a la app.
          if (wasDown && msSinceRefreshAll() > FOREGROUND_MIN_GAP_MS) {
            bump("notifications_notificationsettings");
          }
          wasDown = false;
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setLiveConnected(false);
          wasDown = true;
        }
      });
    });

    return () => {
      cancelled = true;
      setLiveConnected(false);
      stopOwnWrite();
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled]);

  // Al volver a primer plano.
  useEffect(() => {
    if (!userId) return;
    let last = Date.now();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - last < FOREGROUND_MIN_GAP_MS) return;
      last = Date.now();
      // Si el socket ya reconectó y pidió todo hace un momento, no repetir.
      if (msSinceRefreshAll() < RECENT_REFRESH_MS) return;
      refreshAll();
    });
    return () => sub.remove();
  }, [userId]);
}
