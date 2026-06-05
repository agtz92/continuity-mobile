import * as Haptics from "expo-haptics";
import { toast } from "./toast";

/**
 * Confirmation feedback for completing a task/routine: a success haptic tap plus
 * a short toast. Used by TaskRow/RoutineRow so marking something done feels
 * intentional instead of "stuck then it vanishes". Haptics is best-effort (no-op
 * on devices/sims without a Taptic Engine), so failures are swallowed.
 */
export function confirmCompleted(message: string): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
  toast.success(message);
}
