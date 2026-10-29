import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { refreshAll } from "@/lib/outbox";

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
    let cancelled = false;
    let wasDown = false;

    // Un restore o el asistente tocan decenas de filas seguidas: se juntan.
    const flush = () => {
      const tables = pending;
      pending = new Set();
      // Con cambios offline pendientes, primero se mandan (ver `refreshAll`).
      refreshAll();
      listeners.forEach((fn) => fn(tables));
    };
    const bump = (table?: string) => {
      if (table) pending.add(table);
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const channel = supabase.channel(`user:${userId}`, {
      config: { private: true },
    });
    channel.on("broadcast", { event: "changed" }, (msg) => {
      const table = (msg.payload as { table?: string } | undefined)?.table;
      bump(table);
    });

    // Canal privado: el join se autoriza con el JWT contra la política de
    // `realtime.messages`; sin token se rechaza.
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Al reconectar (p. ej. tras volver de segundo plano) pudo haber
          // avisos perdidos: se pide todo una vez, preferencias incluidas.
          if (wasDown) bump("notifications_notificationsettings");
          wasDown = false;
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          wasDown = true;
        }
      });
    });

    return () => {
      cancelled = true;
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
      refreshAll();
    });
    return () => sub.remove();
  }, [userId]);
}
