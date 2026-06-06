import { toast } from "./toast";

// Quick confirmation — shorter than the default toast TTL so it doesn't linger.
const COMPLETED_TOAST_MS = 2500;

/**
 * Confirmation feedback for completing a task/routine: a haptic tap plus a short
 * toast. The toast fires synchronously and always; the haptic is best-effort.
 */
export function confirmCompleted(message: string): void {
  void triggerHaptic();
  toast.success(message, COMPLETED_TOAST_MS);
}

async function triggerHaptic(): Promise<void> {
  try {
    // Dynamic + guarded so a build without the native module never crashes.
    // `default ?? mod` covers Metro's CJS/ESM interop (named exports can land
    // under `.default`, which silently left the API undefined before).
    const mod = (await import("expo-haptics")) as Record<string, unknown>;
    const Haptics = (mod.default ?? mod) as typeof import("expo-haptics");
    // Success notification haptic — the gentle "two soft taps" iOS pattern.
    // The haptic type is pure JS, so it hot-reloads with no rebuild once the
    // native module is linked in the build.
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (err) {
    console.warn("[haptics] not fired:", err);
  }
}
