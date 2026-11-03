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
 * taps" iOS success pattern. Ya no lleva toast: el cue bajo el dedo confirma
 * (ver `components/tasks/cue.ts`) y el toast solo ofrece "Deshacer".
 */
export function confirmCompleted(): void {
  void runHaptic((H) => H.notificationAsync(H.NotificationFeedbackType.Success));
}

/**
 * Subtle selection tap for toggles, segmented controls and the FAB — the same
 * feel iOS pickers/switches use.
 */
export function selectionFeedback(): void {
  void runHaptic((H) => H.selectionAsync());
}

/**
 * Destructive feedback for deletes — the iOS "warning" notification pattern
 * (a firmer double buzz) so removing a note/section/task feels deliberate.
 */
export function deleteFeedback(): void {
  void runHaptic((H) => H.notificationAsync(H.NotificationFeedbackType.Warning));
}

/**
 * A physical "tap" with selectable weight, for satisfying one-off actions:
 * pinning, opening the assistant speed-dial, etc. Defaults to a light tap.
 */
export function impactFeedback(
  strength: "light" | "medium" | "heavy" = "light",
): void {
  void runHaptic((H) =>
    H.impactAsync(
      strength === "heavy"
        ? H.ImpactFeedbackStyle.Heavy
        : strength === "medium"
          ? H.ImpactFeedbackStyle.Medium
          : H.ImpactFeedbackStyle.Light,
    ),
  );
}
