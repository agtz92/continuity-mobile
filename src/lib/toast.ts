export type ToastKind = "error" | "success" | "info";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type Listener = (toasts: Toast[]) => void;

const listeners = new Set<Listener>();
let toasts: Toast[] = [];
let nextId = 0;
const DEFAULT_TTL_MS = 6000;

const emit = () => {
  for (const l of listeners) l(toasts);
};

const push = (kind: ToastKind, message: string, ttl = DEFAULT_TTL_MS) => {
  // El mismo aviso ya en pantalla no se apila: sin red, plegar secciones de
  // una nota (cada una es una mutación) llenaba la pantalla de copias.
  const same = toasts.find((t) => t.kind === kind && t.message === message);
  if (same) return same.id;
  const id = ++nextId;
  toasts = [...toasts, { id, kind, message }];
  emit();
  if (ttl > 0) {
    setTimeout(() => dismiss(id), ttl);
  }
  return id;
};

const dismiss = (id: number) => {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
};

export const toast = {
  error: (message: string, ttl?: number) => push("error", message, ttl),
  success: (message: string, ttl?: number) => push("success", message, ttl),
  info: (message: string, ttl?: number) => push("info", message, ttl),
  dismiss,
};

export const subscribeToasts = (listener: Listener) => {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
};
