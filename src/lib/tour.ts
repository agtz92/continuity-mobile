// Cross-screen trigger for the dashboard tour. The onboarding flow (or the
// "watch tour again" button in Appearance) lives on a different route than the
// DashboardTour overlay, and threading a `?tour=1` param through expo-router's
// nested layouts is fragile. Instead we use a tiny pub/sub flag, mirroring the
// toast.ts pattern: the requester sets a one-shot flag + notifies, the tour
// consumes it on the next dashboard mount.

let pending = false;
const listeners = new Set<() => void>();

/** Arm the tour. Fires listeners so an already-mounted tour starts immediately. */
export function requestTour(): void {
  pending = true;
  listeners.forEach((l) => l());
}

/** Read-and-clear the armed flag. Returns true at most once per request. */
export function consumeTourRequest(): boolean {
  const v = pending;
  pending = false;
  return v;
}

export function subscribeTour(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ── Today customize hand-off ────────────────────────────────────────────────
// Same one-shot pub/sub, used by onboarding step 5 to open the Today layout
// editor on the next Today mount. Kept separate from the tour flag so the two
// hand-offs never consume each other.

let customizePending = false;
const customizeListeners = new Set<() => void>();

/** Arm the Today customize editor. Fires listeners so an already-mounted Today opens it. */
export function requestCustomize(): void {
  customizePending = true;
  customizeListeners.forEach((l) => l());
}

/** Read-and-clear the armed flag. Returns true at most once per request. */
export function consumeCustomizeRequest(): boolean {
  const v = customizePending;
  customizePending = false;
  return v;
}

export function subscribeCustomize(cb: () => void): () => void {
  customizeListeners.add(cb);
  return () => {
    customizeListeners.delete(cb);
  };
}
