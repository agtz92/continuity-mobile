import { useEffect, useState } from "react";
import { CaptureSheet } from "@/components/capture/CaptureSheet";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Abre la captura rápida desde cualquier pantalla (lo usa el FAB). */
export function openCapture(): void {
  listeners.forEach((fn) => fn());
}

/**
 * La única hoja de captura de la app, montada solo mientras se usa.
 *
 * Antes cada FAB (uno por pantalla, hasta seis montados a la vez) traía su
 * propio `CaptureSheet` siempre montado y suscrito al dashboard: cada
 * respuesta los re-renderizaba todos, y abrir el `+` re-renderizaba la hoja
 * oculta. Aquí se monta al abrir y se desmonta cuando la hoja **terminó** de
 * cerrarse (`onClosed`), así que la animación de salida se ve completa.
 *
 * Vive en el layout del dashboard, que es donde están todos los FAB.
 */
export function CaptureHost() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const open = () => {
      setMounted(true);
      setVisible(true);
    };
    listeners.add(open);
    return () => {
      listeners.delete(open);
    };
  }, []);

  if (!mounted) return null;
  return (
    <CaptureSheet
      visible={visible}
      onClose={() => setVisible(false)}
      onClosed={() => setMounted(false)}
    />
  );
}
