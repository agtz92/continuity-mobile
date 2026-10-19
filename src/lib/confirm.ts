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

/**
 * Three-way variant of `confirmAsync` (mirrors the web's `choiceDialog`): the
 * destructive action plus a suggested alternative. Resolves "confirm", "alt"
 * or null on cancel. Native alerts can't be tinted, so the alternative sits as
 * the plain (non-destructive) button and `message` carries the nudge.
 */
export function choiceAsync(
  title: string,
  message: string,
  confirmLabel: string,
  altLabel: string,
  cancelLabel = "Cancel",
): Promise<"confirm" | "alt" | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(null) },
        {
          text: confirmLabel,
          style: "destructive",
          onPress: () => {
            deleteFeedback();
            resolve("confirm");
          },
        },
        { text: altLabel, onPress: () => resolve("alt") },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
