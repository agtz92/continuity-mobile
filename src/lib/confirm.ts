import { Alert } from "react-native";

/**
 * Promise-based replacement for the web's `window.confirm`. Mutation hooks that
 * gate a destructive action behind a confirmation use this so the logic stays
 * in the hook (mirroring the web port) instead of leaking into every caller.
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
        onPress: () => resolve(true),
      },
    ]);
  });
}
