import { Alert } from "react-native";
import { deleteFeedback } from "./feedback";

/**
 * Promise-based replacement for the web's `window.confirm`. Mutation hooks that
 * gate a destructive action behind a confirmation use this so the logic stays
 * in the hook (mirroring the web port) instead of leaking into every caller.
 *
 * The confirm button is always destructive — fire the warning haptic when it's
 * tapped so every delete routed through here (tasks, routines, ideas, projects,
 * notes) gets consistent tactile feedback from a single place.
 */
export function confirmAsync(
  title: string,
  message?: string,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: "destructive",
        onPress: () => {
          deleteFeedback();
          resolve(true);
        },
      },
    ]);
  });
}
