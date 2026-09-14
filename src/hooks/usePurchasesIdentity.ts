import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { identifyForPurchases, logOutOfPurchases } from "@/lib/purchases";

/**
 * Ata las compras al usuario en cuanto hay sesión.
 *
 * Esto no es opcional ni cosmético: sin `logIn`, RevenueCat manda un
 * `$RCAnonymousID:…` como `app_user_id`, y el webhook del backend lo descarta
 * explícitamente (`_parse_user_id` en `core/billing/store_webhooks.py`). O sea
 * que **la compra se cobraría y el plan no se movería** — el peor fallo posible
 * en esta parte de la app.
 *
 * Corre en cada arranque con sesión, no solo al iniciar sesión: el SDK guarda
 * su propio estado en el dispositivo y una reinstalación vuelve al id anónimo.
 */
export function usePurchasesIdentity() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      void logOutOfPurchases();
      return;
    }
    void identifyForPurchases(userId);
  }, [userId]);
}
