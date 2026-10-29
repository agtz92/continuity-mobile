import AsyncStorage from "@react-native-async-storage/async-storage";
import { apolloClient } from "./apollo";
import { purgePersistedCache } from "./cachePersist";
import { purgeOutbox } from "./outbox";
import { UNREGISTER_PUSH_TOKEN } from "./graphql";
import { DEVICE_ID_KEY, LAST_RESPONSE_KEY, PUSH_BACKEND_READY, isExpoGo } from "./notifications";
import { supabase } from "./supabase";

/** Claves de AsyncStorage que son de la cuenta, no del dispositivo. Tema,
 *  paleta e idioma se quedan: son cómo se ve la app en este teléfono y el
 *  servidor los vuelve a aplicar al entrar. */
const USER_KEYS = [
  DEVICE_ID_KEY,
  LAST_RESPONSE_KEY,
  "continuity.dismissedNotifications",
];

/**
 * Cerrar sesión desde un botón. Primero da de baja el token push de este
 * dispositivo —después ya no hay sesión con qué hacerlo— para que la cuenta
 * deje de recibir avisos aquí. Si falla (sin red), se cierra sesión igual: el
 * backend también reasigna el token a quien lo registre después.
 *
 * Tras borrar la cuenta no hace falta (el backend ya borró sus tokens): usa
 * `{ skipUnregister: true }`.
 */
export async function signOut({ skipUnregister = false } = {}): Promise<void> {
  if (!skipUnregister && !isExpoGo && PUSH_BACKEND_READY) {
    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);
    if (deviceId) {
      await Promise.race([
        apolloClient
          .mutate({ mutation: UNREGISTER_PUSH_TOKEN, variables: { deviceId } })
          .catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    }
  }
  await supabase.auth.signOut().catch(() => undefined);
}

/** Lo corre `AuthProvider` en cada SIGNED_OUT, venga de donde venga (botón,
 *  sesión expirada, borrado de cuenta). */
export async function clearUserData(): Promise<void> {
  // Primero la caché en disco: si no, el guardado pendiente reescribiría el
  // archivo con lo que aún queda en memoria.
  purgePersistedCache();
  // Cambios offline sin mandar: son de esta cuenta y no deben salir con otra.
  purgeOutbox();
  await AsyncStorage.multiRemove(USER_KEYS).catch(() => undefined);
  await apolloClient.clearStore().catch(() => undefined);
}
