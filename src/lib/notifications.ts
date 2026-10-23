import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import i18n from "./i18n";

/**
 * Push notifications client helpers (Fase 8).
 *
 * Two hard realities shape this module:
 *  1. Expo Go (SDK 53+) dropped remote push support. Calling the token APIs
 *     there throws / warns, so we detect the runtime and no-op cleanly. Daily
 *     testing in Expo Go keeps working; real push only runs in a dev/standalone
 *     build.
 *  2. El backend ya existe: `registerPushToken`/`unregisterPushToken` en
 *     `core/notifications/schema.py`, su modelo, y el emisor de Expo Push en
 *     `core/notifications/providers/expo.py`. Está en `origin/master` desde
 *     `95b9911`, así que Render lo sirve.
 */

// Expo Go reports StoreClient; dev client / standalone report bare/standalone.
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Encendido por instrucción explícita del dueño (11 sep 2026), que es lo que
// el comentario anterior exigía para tocar esto.
//
// Se verificó antes de encenderlo: las mutaciones están en `origin/master`
// desde `95b9911`, y el registro en `usePushNotifications` ya vive dentro de un
// `try/catch` que solo hace `console.warn` y permite reintentar. Es decir, el
// riesgo que temía el comentario —"erroraría en cada inicio de sesión"— no
// existía con este código: un fallo aquí nunca rompe el login.
//
// Sigue siendo una variable y no un `true` literal a propósito: si el backend
// se cae o se revierte, `EXPO_PUBLIC_PUSH_ENABLED=false` lo apaga **sin
// recompilar**. Un interruptor que exige un build de 20 minutos no es un
// interruptor.
export const PUSH_BACKEND_READY =
  process.env.EXPO_PUBLIC_PUSH_ENABLED !== "false";

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

// Action sets the backend attaches as `categoryId` (backend
// core/notifications/builders.py, CATEGORY_*). Keep the ids in sync.
export const PUSH_CATEGORY = {
  taskFocus: "task_focus", // one task: Marcar hecha · Pasar a mañana
  tasksBulk: "tasks_bulk", // several: Pasar todas a mañana
} as const;

export type PushActionId = "complete" | "postpone";

// One Android channel per kind, so the user can mute the weekly summary and
// keep the end-of-day heads-up. The backend only targets them once
// EXPO_PUSH_ANDROID_CHANNELS is on (Android drops a push aimed at a channel the
// device hasn't created).
const ANDROID_CHANNELS = [
  { id: "daily", importance: Notifications.AndroidImportance.DEFAULT },
  { id: "reminders", importance: Notifications.AndroidImportance.HIGH },
  { id: "weekly", importance: Notifications.AndroidImportance.LOW },
  { id: "announcements", importance: Notifications.AndroidImportance.DEFAULT },
] as const;

/**
 * Registers the action buttons and Android channels, labelled in the current
 * language. Re-run on language change: the OS keeps the labels it was given.
 *
 * Buttons open the app (`opensAppToForeground`): the action then runs through
 * the normal authenticated Apollo client and confirms with a toast. Running it
 * without opening the app needs a background task (expo-task-manager), which
 * on iOS still can't wake a terminated app — so it isn't worth a native build.
 */
async function configurePushPresentation() {
  const t = i18n.t.bind(i18n);
  try {
    if (Platform.OS === "android") {
      await Promise.all(
        ANDROID_CHANNELS.map((c) =>
          Notifications.setNotificationChannelAsync(c.id, {
            name: t(`push.channels.${c.id}`),
            importance: c.importance,
          }),
        ),
      );
    }
    const opens = { opensAppToForeground: true };
    await Notifications.setNotificationCategoryAsync(PUSH_CATEGORY.taskFocus, [
      { identifier: "complete", buttonTitle: t("push.actions.complete"), options: opens },
      { identifier: "postpone", buttonTitle: t("push.actions.postpone"), options: opens },
    ]);
    await Notifications.setNotificationCategoryAsync(PUSH_CATEGORY.tasksBulk, [
      { identifier: "postpone", buttonTitle: t("push.actions.postponeAll"), options: opens },
    ]);
  } catch (err) {
    console.warn("[push] failed to configure categories/channels:", err);
  }
}

if (!isExpoGo) {
  void configurePushPresentation();
  i18n.on("languageChanged", () => void configurePushPresentation());
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

/** The action button the user pressed, with the tasks it applies to — or null
 * for a plain tap (or a push without task ids). */
export function actionFromResponse(
  resp: Notifications.NotificationResponse,
): { action: PushActionId; taskIds: string[] } | null {
  const id = resp.actionIdentifier;
  if (id !== "complete" && id !== "postpone") return null;
  const data = resp.notification.request.content.data as NotificationData | null;
  const raw = data?.taskIds;
  const taskIds = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  return taskIds.length ? { action: id, taskIds } : null;
}

const LAST_RESPONSE_KEY = "continuity.lastPushResponse";
let lastHandled: string | null = null;

/**
 * True the first time a given response (notification × button) is seen.
 * The same response can arrive twice — the live listener and the cold-start
 * `getLastNotificationResponseAsync` — and the latter can replay a stale one on
 * a later launch. Persisted so a replay never re-runs an action or re-navigates.
 */
export async function claimResponse(
  resp: Notifications.NotificationResponse,
): Promise<boolean> {
  const key = `${resp.notification.request.identifier}:${resp.actionIdentifier}`;
  if (lastHandled === key) return false;
  lastHandled = key;
  try {
    if ((await AsyncStorage.getItem(LAST_RESPONSE_KEY)) === key) return false;
    await AsyncStorage.setItem(LAST_RESPONSE_KEY, key);
  } catch {
    // Storage hiccup: the in-memory guard still covers the double delivery.
  }
  return true;
}

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
