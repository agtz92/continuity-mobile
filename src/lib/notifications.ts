import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

/**
 * Push notifications client helpers (Fase 8).
 *
 * Two hard realities shape this module:
 *  1. Expo Go (SDK 53+) dropped remote push support. Calling the token APIs
 *     there throws / warns, so we detect the runtime and no-op cleanly. Daily
 *     testing in Expo Go keeps working; real push only runs in a dev/standalone
 *     build.
 *  2. The backend (registerPushToken mutation + Expo Push API sender) does not
 *     exist yet in agtz92/continuity_backend. PUSH_BACKEND_READY gates the
 *     actual registration call — flip it on (or wire to an env flag) once the
 *     mutation lands. Everything else is ready.
 */

// Expo Go reports StoreClient; dev client / standalone report bare/standalone.
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Backend push (Fase 8) is IMPLEMENTED but not yet DEPLOYED. Keep this false so
// the client doesn't call registerPushToken against a production schema that
// still lacks it (that would error on every sign-in).
//
// ⚠️ DO NOT flip this to true on your own. Only the repo owner (alfredo) decides
// when the backend is live — flip it ONLY when he explicitly says so.
export const PUSH_BACKEND_READY = false;

const DEVICE_ID_KEY = "continuity.deviceId";

// How a notification is presented while the app is foregrounded. Safe to set in
// a build; skipped under Expo Go to avoid the unsupported-API warning banner.
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Stable per-install id for registerPushToken(deviceId). Persisted once. */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const c = globalThis.crypto as Crypto | undefined;
  const id =
    c && typeof c.randomUUID === "function"
      ? c.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function getProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  // easConfig is injected into builds; expoConfig.extra.eas in dev.
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig
    ?.projectId;
  return fromConfig ?? fromEas;
}

/**
 * Requests permission and returns the Expo push token, or null when not
 * possible (Expo Go, simulator, permission denied, or no EAS projectId yet —
 * run `eas init`). Never throws.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo) {
    console.warn(
      "[push] skipped: Expo Go doesn't support remote push (SDK 53+). Use a dev build.",
    );
    return null;
  }
  if (!Device.isDevice) {
    console.warn("[push] skipped: requires a physical device.");
    return null;
  }
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") {
      console.warn("[push] permission not granted.");
      return null;
    }
    const projectId = getProjectId();
    if (!projectId) {
      console.warn("[push] no EAS projectId — run `eas init` to generate one.");
      return null;
    }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn("[push] error getting token:", err);
    return null;
  }
}

type NotificationData = {
  // The backend sends either { type, id } or a ready-made app path.
  type?: "project" | "task" | "assistant" | (string & {});
  id?: string | number;
  path?: string;
  [key: string]: unknown;
};

/**
 * Navigates based on a tapped notification's payload. No-op for unknown shapes,
 * so a malformed/unsupported push just opens the app without crashing.
 */
export function routeFromNotification(data: NotificationData | null | undefined) {
  if (!data) return;
  if (typeof data.path === "string" && data.path.startsWith("/")) {
    router.push(data.path as never);
    return;
  }
  const id = data.id != null ? String(data.id) : undefined;
  switch (data.type) {
    case "project":
      if (id) router.push({ pathname: "/project/[id]", params: { id } });
      break;
    case "task":
      if (id) router.push({ pathname: "/task-form", params: { id } });
      break;
    case "assistant":
      router.push("/assistant");
      break;
    default:
      break;
  }
}
