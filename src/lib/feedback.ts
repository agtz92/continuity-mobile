import { toast } from "./toast";

/**
 * Confirmation feedback for completing a task/routine: a success haptic tap plus
 * a short toast. Used by TaskRow/RoutineRow so marking something done feels
 * intentional instead of "stuck then it vanishes".
 *
 * The haptic is fully best-effort and isolated: expo-haptics is a NATIVE module,
 * so on a dev build made before it was added (or a device without a Taptic
 * Engine) it can be missing and throw. We load + call it via a guarded async
 * helper so a failure NEVER blocks the toast — the toast fires synchronously
 * regardless.
 */
// Quick confirmation — shorter than the default toast TTL so it doesn't linger.
const COMPLETED_TOAST_MS = 2500;

export function confirmCompleted(message: string): void {
  void triggerSuccessHaptic();
  toast.success(message, COMPLETED_TOAST_MS);
}

async function triggerSuccessHaptic(): Promise<void> {
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* native module missing / unsupported — silently skip */
  }
}
