import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useMutation } from "@apollo/client/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { REGISTER_PUSH_TOKEN, RUN_NOTIFICATION_ACTION } from "@/lib/graphql";
import {
  PUSH_BACKEND_READY,
  actionFromResponse,
  claimResponse,
  getDeviceId,
  getExpoPushToken,
  isExpoGo,
  routeFromNotification,
} from "@/lib/notifications";
import { toast } from "@/lib/toast";

/**
 * Wires push notifications into the authenticated app surface (Fase 8). Mounted
 * once in the dashboard layout. Responsibilities:
 *  - On sign-in, fetch the Expo push token and (when the backend is ready)
 *    register it via registerPushToken(token, deviceId).
 *  - Navigate when the user taps a notification (foreground/background).
 *  - Run the action buttons ("Marcar hecha" / "Pasar a mañana") through
 *    runNotificationAction, then confirm with a toast.
 *  - Handle cold-start: app opened directly from a notification.
 *
 * Fully inert under Expo Go (no remote push there) — daily testing is unaffected.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { t } = useTranslation();
  const [registerToken] = useMutation(REGISTER_PUSH_TOKEN);
  // "active" so Today/Tasks show the change right away (the live signal would
  // also refetch, but only after its debounce).
  const [runAction] = useMutation<{ runNotificationAction: number }>(
    RUN_NOTIFICATION_ACTION,
    { refetchQueries: "active" },
  );
  const registeredFor = useRef<string | null>(null);

  const handleResponse = useCallback(
    async (resp: Notifications.NotificationResponse) => {
      if (!(await claimResponse(resp))) return;
      const data = resp.notification.request.content.data as Record<string, unknown>;
      const act = actionFromResponse(resp);
      if (act) {
        try {
          const res = await runAction({
            variables: { action: act.action.toUpperCase(), taskIds: act.taskIds },
          });
          const changed = res.data?.runNotificationAction ?? 0;
          if (!changed) toast.info(t("push.result.nothing"));
          else if (act.action === "complete") toast.success(t("push.result.completed"));
          else toast.success(t("push.result.postponed", { count: changed }));
        } catch (err) {
          console.warn("[push] action failed:", err);
          toast.error(t("push.actionFailed"));
        }
      }
      routeFromNotification(data);
    },
    [runAction, t],
  );

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
        // Apagado a mano con EXPO_PUBLIC_PUSH_ENABLED=false. El token está
        // listo; simplemente no se manda a ningún sitio.
        console.log("[push] token ready (registro desactivado):", token);
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

  // Tap (or action button) on a notification while the app is running.
  useEffect(() => {
    if (isExpoGo) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      void handleResponse(resp);
    });
    return () => sub.remove();
  }, [handleResponse]);

  // Cold start: app launched by tapping a notification.
  useEffect(() => {
    if (isExpoGo) return;
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (active && resp) void handleResponse(resp);
    });
    return () => {
      active = false;
    };
  }, [handleResponse]);
}
