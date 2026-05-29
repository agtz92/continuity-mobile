import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth";
import { REGISTER_PUSH_TOKEN } from "@/lib/graphql";
import {
  PUSH_BACKEND_READY,
  getDeviceId,
  getExpoPushToken,
  isExpoGo,
  routeFromNotification,
} from "@/lib/notifications";

/**
 * Wires push notifications into the authenticated app surface (Fase 8). Mounted
 * once in the dashboard layout. Responsibilities:
 *  - On sign-in, fetch the Expo push token and (when the backend is ready)
 *    register it via registerPushToken(token, deviceId).
 *  - Navigate when the user taps a notification (foreground/background).
 *  - Handle cold-start: app opened directly from a notification.
 *
 * Fully inert under Expo Go (no remote push there) — daily testing is unaffected.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [registerToken] = useMutation(REGISTER_PUSH_TOKEN);
  const registeredFor = useRef<string | null>(null);

  // Register the token once per signed-in user.
  useEffect(() => {
    if (isExpoGo) return;
    if (!userId) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userId) return;

    let cancelled = false;
    void (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      registeredFor.current = userId;
      if (!PUSH_BACKEND_READY) {
        // Backend not built yet — token is ready, just nowhere to send it.
        console.log("[push] token ready (backend pending):", token);
        return;
      }
      try {
        const deviceId = await getDeviceId();
        await registerToken({ variables: { token, deviceId } });
      } catch (err) {
        console.warn("[push] failed to register token:", err);
        registeredFor.current = null; // allow a retry next time
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, registerToken]);

  // Tap on a notification while the app is running.
  useEffect(() => {
    if (isExpoGo) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      routeFromNotification(
        resp.notification.request.content.data as Record<string, unknown>,
      );
    });
    return () => sub.remove();
  }, []);

  // Cold start: app launched by tapping a notification.
  useEffect(() => {
    if (isExpoGo) return;
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (active && resp) {
        routeFromNotification(
          resp.notification.request.content.data as Record<string, unknown>,
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);
}
