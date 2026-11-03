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

// ---- "Deshacer" -------------------------------------------------------------
// Canal aparte del de avisos: un solo toast abajo que cuenta las filas que se
// fueron ("3 hechas"). Cada completada reinicia el plazo; "Deshacer" revierte
// la última y descuenta. Lo pinta `UndoToast`.

type UndoListener = (count: number) => void;

const undoListeners = new Set<UndoListener>();
let undoStack: Array<() => unknown> = [];
let undoTimer: ReturnType<typeof setTimeout> | null = null;
let undoLongTtl = false;

const UNDO_TTL_MS = 4000;
// Con lector de pantalla hace falta más tiempo para llegar al botón.
const UNDO_TTL_SR_MS = 8000;

const emitUndo = () => {
  for (const l of undoListeners) l(undoStack.length);
};

const armUndo = () => {
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(clearUndo, undoLongTtl ? UNDO_TTL_SR_MS : UNDO_TTL_MS);
};

/** Ofrece revertir una fila que salió de la lista. */
export function offerUndo(onUndo: () => unknown): void {
  undoStack = [...undoStack, onUndo];
  armUndo();
  emitUndo();
}

/** Revierte la última completada; con 0 pendientes el toast se va. */
export function runUndo(): void {
  const last = undoStack[undoStack.length - 1];
  undoStack = undoStack.slice(0, -1);
  if (undoStack.length === 0) clearUndo();
  else emitUndo();
  void last?.();
}

export function clearUndo(): void {
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = null;
  if (undoStack.length === 0 && undoListeners.size === 0) return;
  undoStack = [];
  emitUndo();
}

export function setUndoLongTtl(long: boolean): void {
  undoLongTtl = long;
}

export const subscribeUndo = (listener: UndoListener) => {
  undoListeners.add(listener);
  listener(undoStack.length);
  return () => {
    undoListeners.delete(listener);
  };
};
