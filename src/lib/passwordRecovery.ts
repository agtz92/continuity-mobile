/**
 * Estado del flujo "olvidé mi contraseña" mientras el usuario elige la nueva.
 *
 * El enlace del correo abre `continuity://auth/reset?code=…` (ruta
 * `src/app/auth/reset.tsx`). Al canjear el código, Supabase deja una sesión
 * válida — para el gate de auth es un login cualquiera y mandaría al usuario a
 * Today sin pedirle la contraseña nueva. Esta bandera le dice al gate
 * (`useProtectedRoute` en `src/app/_layout.tsx`) que no lo saque de esa pantalla.
 *
 * Vive a nivel de módulo, no en estado de React, a propósito: al cambiar la
 * sesión, `CachePersistGate` desmonta y vuelve a montar el navegador entero, y
 * con él la pantalla. La bandera y los códigos ya canjeados sobreviven a eso
 * (un código PKCE solo se canjea una vez; reintentarlo tras el remount fallaría).
 */

import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";

/**
 * Por qué no se pudo usar un enlace de recuperación, en términos del usuario:
 * - `network`: no hubo conexión; el código sigue válido y se puede reintentar.
 * - `otherDevice`: el enlace se abrió en otro teléfono o navegador (falta el
 *   verificador PKCE que la app guardó al pedir el correo).
 * - `expired`: venció o ya se usó.
 * - `unknown`: cualquier otra cosa.
 */
export type RecoveryFailure = "network" | "otherDevice" | "expired" | "unknown";

const OTHER_DEVICE = new Set(["pkce_code_verifier_not_found", "bad_code_verifier"]);
const EXPIRED = new Set(["otp_expired", "flow_state_expired", "flow_state_not_found"]);

export function classifyRecoveryError(error: AuthError): RecoveryFailure {
  if (isAuthRetryableFetchError(error)) return "network";
  const code = error.code ?? "";
  if (OTHER_DEVICE.has(code) || error.name === "AuthPKCECodeVerifierMissingError") {
    return "otherDevice";
  }
  if (EXPIRED.has(code)) return "expired";
  return "unknown";
}

let pending = false;
const claimed = new Set<string>();

export function markRecoveryPending(): void {
  pending = true;
}

export function clearRecoveryPending(): void {
  pending = false;
}

export function isRecoveryPending(): boolean {
  return pending;
}

/** `true` la primera vez que se ve este código en esta ejecución de la app. */
export function claimRecoveryCode(code: string): boolean {
  if (claimed.has(code)) return false;
  claimed.add(code);
  return true;
}

/** Devuelve un código a "no canjeado": el canje falló por red y se puede reintentar. */
export function releaseRecoveryCode(code: string): void {
  claimed.delete(code);
}

/**
 * Parámetros de un enlace de vuelta de Supabase: query **y** fragmento. Los
 * errores (`error_description`, enlace vencido) pueden llegar en cualquiera de
 * los dos según el flujo, y expo-router solo expone la query.
 */
export function linkParams(url: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!url) return out;
  const read = (part: string) => {
    for (const pair of part.split("&")) {
      if (!pair) continue;
      const [k, ...rest] = pair.split("=");
      try {
        out[decodeURIComponent(k)] = decodeURIComponent(rest.join("=").replace(/\+/g, " "));
      } catch {
        /* par mal codificado: se ignora */
      }
    }
  };
  const hashAt = url.indexOf("#");
  const queryAt = url.indexOf("?");
  if (queryAt >= 0) read(url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined));
  if (hashAt >= 0) read(url.slice(hashAt + 1));
  return out;
}
