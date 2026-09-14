import type {
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * RevenueCat, con una regla que manda sobre todo lo demás: **la app nunca se
 * concede un plan a sí misma**.
 *
 * El backend lo dice sin ambigüedad (`core/billing/store_webhooks.py`): "the
 * store is authoritative about *payment*; this endpoint is authoritative about
 * *entitlement*. The mobile client never grants itself a plan from a local
 * receipt — it asks the backend, which only knows what arrived here."
 *
 * Así que tras comprar no se pinta Studio porque el recibo local lo diga: se
 * vuelve a preguntar a `/usage/`. El `customerInfo` del SDK solo sirve para
 * saber si la compra se completó, no para abrir funciones.
 *
 * `appUserID` **tiene que ser el uuid del usuario**. Sin `logIn`, RevenueCat
 * manda `$RCAnonymousID:…` y el webhook lo descarta (`_parse_user_id`): la
 * compra se cobra y el plan no se mueve.
 */

// Expo Go no tiene el módulo nativo. Todo aquí es inerte ahí, igual que push.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * El SDK se carga **perezosamente**, nunca en el import.
 *
 * `react-native-purchases` trae código nativo. Un `import` arriba del archivo
 * se evalúa al arrancar la app, y en un binario que todavía no lo incluye
 * —cualquier dev client anterior a instalarlo— eso **tumba la app entera**
 * antes de pintar nada. Un módulo de compras no puede impedir que la app abra.
 *
 * Con `require` dentro de una función, el fallo queda contenido: no hay SDK,
 * no hay compras, y el resto de la app funciona igual.
 */
function sdk(): typeof import("react-native-purchases").default | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default ?? null;
  } catch {
    return null;
  }
}

const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

/** Sin SDK nativo o sin clave no hay compras; se dice, no se finge. */
export const purchasesAvailable = !isExpoGo && !!API_KEY && sdk() != null;

let configured = false;

export function configurePurchases(): void {
  const P = sdk();
  if (!purchasesAvailable || configured || !P) return;
  configured = true;
  P.configure({ apiKey: API_KEY as string });
}

/**
 * Ata las compras al usuario. **Obligatorio antes de comprar.**
 *
 * Se llama en cada arranque con sesión, no solo al iniciar sesión: el SDK
 * guarda su propio estado y un reinstalar deja el id anónimo otra vez.
 */
export async function identifyForPurchases(userId: string): Promise<void> {
  if (!purchasesAvailable) return;
  configurePurchases();
  try {
    await sdk()?.logIn(userId);
  } catch {
    // Un fallo aquí no puede romper el arranque. Lo que no puede pasar es
    // *comprar* sin identidad, y eso lo cubre el guard de `purchasePackage`.
  }
}

export async function logOutOfPurchases(): Promise<void> {
  if (!purchasesAvailable || !configured) return;
  try {
    await sdk()?.logOut();
  } catch {
    /* cerrar sesión nunca debe fallar por esto */
  }
}

/** El offering marcado como actual, o null si no hay ninguno configurado. */
export async function currentOffering(): Promise<PurchasesOffering | null> {
  if (!purchasesAvailable) return null;
  configurePurchases();
  const P = sdk();
  if (!P) return null;
  const offerings = await P.getOfferings();
  return offerings.current ?? null;
}

export type PurchaseOutcome = "purchased" | "cancelled";

/**
 * Compra un paquete. Devuelve si se completó o si el usuario canceló —
 * cancelar **no es un error** y no debe pintar uno.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<PurchaseOutcome> {
  configurePurchases();
  const P = sdk();
  if (!P) throw new Error("unavailable");
  const info = await P.getCustomerInfo();
  if (!info.originalAppUserId || info.originalAppUserId.startsWith("$RCAnonymousID")) {
    // El webhook descartaría esta compra por id anónimo: mejor no cobrarla.
    throw new Error("anonymous");
  }
  try {
    await P.purchasePackage(pkg);
    return "purchased";
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return "cancelled";
    throw e;
  }
}

/** Restaurar compras. Apple lo exige en cualquier app con suscripciones. */
export async function restorePurchases(): Promise<void> {
  configurePurchases();
  const P = sdk();
  if (!P) throw new Error("unavailable");
  await P.restorePurchases();
}
