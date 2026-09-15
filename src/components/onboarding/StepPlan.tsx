import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Meta } from "@/components/ui/Meta";
import { PrimaryButton } from "./controls";

/**
 * Paso 4 — el plan. **Informativo, y sin ninguna salida de la app.**
 *
 * Aquí había un botón que abría `continuu.it/settings/billing` en el navegador.
 * Tenía sentido cuando no existía el paywall nativo: no se podía comprar dentro,
 * así que mandar fuera era la única salida. Con StoreKit ya dentro, eso pasó de
 * ser un apaño a ser un motivo de rechazo — Apple (3.1.1) prohíbe dirigir al
 * usuario a un mecanismo de compra externo para bienes digitales, y esto era
 * literalmente un enlace a la página de suscripción durante el alta.
 *
 * Lo que **no** se hace en su lugar es enlazar al paywall nativo desde aquí. El
 * onboarding vive en una ruta raíz y `/plans` cuelga del stack del dashboard:
 *
 * - En alta de verdad, `useProtectedRoute` ve `status` en `pending`/`in_progress`
 *   y devuelve al usuario a /onboarding en cuanto pisa el dashboard. El botón
 *   rebotaría.
 * - En replay sí navegaría, pero el "atrás" de `/plans` vuelve al stack de "Más",
 *   no al setup: te deja fuera del flujo a medias.
 *
 * Así que el paso dice en qué plan estás y dónde cambiarlo — dentro de la app.
 * El alta dura noventa segundos; el paywall vive en Facturación, que es donde
 * alguien va cuando de verdad quiere cambiar de plan.
 */

/** En qué plan estás y dónde se cambia. Sin enlaces y sin precios. */
function PlanInfo({
  planLabel,
  showHint,
}: {
  planLabel: string;
  /** A los exentos no se les manda a cambiar un plan que no pagan. */
  showHint: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <Text className="text-3xl font-sans-bold text-text">
        {t("onboarding.replay.planHeading")}
      </Text>
      <Text className="font-sans text-base text-text-muted">
        {t("onboarding.replay.planInfo", { plan: planLabel })}
      </Text>
      {showHint && (
        <Meta tone="muted" className="mt-1">
          {t("onboarding.plan.manageHint")}
        </Meta>
      )}
    </View>
  );
}

export function StepPlan({
  name,
  planLabel,
  isExempt,
  replay,
  busy,
  onContinue,
}: {
  name: string;
  planLabel: string;
  isExempt: boolean;
  replay: boolean;
  busy: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  // A los exentos (beta) no se les habla de planes: se les da las gracias.
  const body = isExempt && !replay ? (
    <View className="gap-3">
      <Text className="text-3xl font-sans-bold text-text">
        {t("onboarding.planBeta.heading", { name })}
      </Text>
      <Text className="font-sans text-base leading-relaxed text-text-muted">
        {t("onboarding.planBeta.body", { plan: planLabel })}
      </Text>
      <Text className="font-sans text-base leading-relaxed text-text-muted">
        {t("onboarding.planBeta.body2")}
      </Text>
      <Text className="text-base font-sans-medium text-text">
        — {t("onboarding.planBeta.signoff")}
      </Text>
    </View>
  ) : (
    <PlanInfo planLabel={planLabel} showHint={!isExempt} />
  );

  return (
    <View className="gap-6">
      {body}
      <PrimaryButton
        label={t("onboarding.continue")}
        onPress={onContinue}
        busy={busy}
      />
    </View>
  );
}
