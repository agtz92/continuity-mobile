import { toast } from "./toast";

// Quick confirmation — shorter than the default toast TTL so it doesn't linger.
const COMPLETED_TOAST_MS = 2500;

type HapticsModule = typeof import("expo-haptics");

/**
 * Run a best-effort haptic. expo-haptics is a NATIVE module; on a build made
 * before it was added (or a device without a Taptic Engine) it's missing and
 * throws. Loaded dynamically + guarded so it never blocks the caller. The
 * `default ?? mod` covers Metro's CJS/ESM interop.
 */
async function runHaptic(fn: (h: HapticsModule) => Promise<void>): Promise<void> {
  try {
    const mod = (await import("expo-haptics")) as Record<string, unknown>;
    const Haptics = (mod.default ?? mod) as HapticsModule;
    await fn(Haptics);
  } catch (err) {
    console.warn("[haptics] not fired:", err);
  }
}

/**
 * Confirmation feedback for completing a task/routine: the gentle "two soft
 * taps" iOS success pattern plus a short toast.
 */
export function confirmCompleted(message: string): void {
  void runHaptic((H) => H.notificationAsync(H.NotificationFeedbackType.Success));
  toast.success(message, COMPLETED_TOAST_MS);
}

/**
 * Subtle selection tap for toggles, segmented controls and the FAB — the same
 * feel iOS pickers/switches use.
 */
export function selectionFeedback(): void {
  void runHaptic((H) => H.selectionAsync());
}
