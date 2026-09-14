import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { Check } from "lucide-react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { getUsage, type UsageSnapshot } from "@/lib/assistantApi";
import {
  currentOffering,
  purchasePackage,
  purchasesAvailable,
  restorePurchases,
} from "@/lib/purchases";
import { toast } from "@/lib/toast";
import { confirmCompleted } from "@/lib/feedback";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { Meta } from "@/components/ui/Meta";
import { Figure } from "@/components/ui/Figure";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeletons";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * La pantalla de planes: lo único de la app que cobra dinero.
 *
 * Tres reglas la gobiernan, y ninguna es estética:
 *
 * 1. **Los precios salen de la tienda**, nunca del código. `priceString` viene
 *    con la moneda y el formato del país del usuario. Escribir "$8.99" aquí
 *    sería mentirle a un europeo y quedaría desfasado en cuanto cambies un
 *    precio en App Store Connect.
 * 2. **El plan lo concede el servidor.** Tras comprar se vuelve a pedir
 *    `/usage/`: el recibo local dice que se pagó, no qué plan tienes. Es lo que
 *    el backend llama ser autoritativo sobre el *entitlement*.
 * 3. **Plan y periodo se deducen del product id**, igual que el backend
 *    (`core/billing/catalog.py`). No del tipo de paquete: los identificadores
 *    del offering son propios (`$pro_monthly`), así que el SDK los reporta como
 *    CUSTOM y emparejar por ahí no funcionaría.
 */

type Period = "monthly" | "annual";
type Tier = "pro" | "studio";

/** Del product id al plan y periodo. Mismo criterio que el servidor. */
function classify(productId: string): { tier: Tier; period: Period } | null {
  const id = productId.toLowerCase();
  const tier: Tier | null = id.includes("studio")
    ? "studio"
    : id.includes("pro")
      ? "pro"
      : null;
  if (!tier) return null;
  // Los sufijos como `_v2` no estorban: se busca la palabra, no una igualdad.
  const period: Period =
    id.includes("annual") || id.includes("year") ? "annual" : "monthly";
  return { tier, period };
}

export default function Plans() {
  const { t } = useTranslation();
  const c = useThemeColors();

  const [period, setPeriod] = useState<Period>("annual");
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  // `empty` no es `error`: la tienda contestó, simplemente no hay nada que
  // vender todavía. Decir "no pudimos contactar a la tienda" cuando sí se
  // contactó manda a depurar en la dirección equivocada.
  const [status, setStatus] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [offering, snap] = await Promise.all([
        currentOffering(),
        getUsage().catch(() => null),
      ]);
      if (snap) setUsage(snap);
      const map: Record<string, PurchasesPackage> = {};
      for (const pkg of offering?.availablePackages ?? []) {
        const hit = classify(pkg.product.identifier);
        if (hit) map[hit.tier + ":" + hit.period] = pkg;
      }
      setPackages(map);
      if (__DEV__ && Object.keys(map).length === 0) {
        console.log(
          "[plans] offering:",
          offering?.identifier ?? "(ninguno marcado como current)",
          "paquetes:",
          offering?.availablePackages?.map((x) => x.product.identifier) ?? []
        );
      }
      setStatus(Object.keys(map).length === 0 ? "empty" : "ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (key: string) => {
    const pkg = packages[key];
    if (!pkg) return;
    setBusy(key);
    try {
      const outcome = await purchasePackage(pkg);
      if (outcome === "cancelled") return; // Cancelar no es un error.
      confirmCompleted(t("plans.purchased"));
      // El plan lo dice el servidor, no el recibo.
      const snap = await getUsage().catch(() => null);
      if (snap) setUsage(snap);
    } catch (err) {
      toast.error(
        (err as Error).message === "anonymous"
          ? t("plans.errorIdentity")
          : t("plans.errorPurchase")
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      await restorePurchases();
      const snap = await getUsage().catch(() => null);
      if (snap) setUsage(snap);
      toast.success(t("plans.restored"));
    } catch {
      toast.error(t("plans.errorRestore"));
    } finally {
      setBusy(null);
    }
  };

  if (!purchasesAvailable) {
    // Expo Go, o falta la clave. Se dice: un paywall que no puede cobrar es
    // peor que no tenerlo.
    return (
      <View className="flex-1 bg-bg px-5">
        <EmptyState
          title={t("plans.unavailableTitle")}
          body={t("plans.unavailableBody")}
        />
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View className="flex-1 gap-4 bg-bg p-5">
        <Skeleton h={44} r={10} />
        <Skeleton h={220} r={14} />
        <Skeleton h={220} r={14} />
      </View>
    );
  }

  if (status === "error" || status === "empty") {
    return (
      <View className="flex-1 bg-bg px-5">
        <EmptyState
          title={t(status === "empty" ? "plans.emptyTitle" : "plans.errorTitle")}
          body={t(status === "empty" ? "plans.emptyBody" : "plans.errorBody")}
          actions={
            <Pressable
              onPress={() => void load()}
              className="rounded-md border px-4 py-2"
              style={{ borderColor: c.accent }}
            >
              <Text className="font-sans-medium text-sm" style={{ color: c.accent }}>
                {t("routeError.retry")}
              </Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  const currentTier: Tier | null =
    usage?.plan === "studio" || usage?.plan === "admin"
      ? "studio"
      : usage?.plan === "pro"
        ? "pro"
        : null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenTitle>{t("plans.title")}</ScreenTitle>

      {/* Anual por defecto: deja más y el descuento se ve solo. */}
      <View className="flex-row rounded-lg border border-border p-1">
        {(["monthly", "annual"] as Period[]).map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center rounded-md py-2"
              style={{ backgroundColor: active ? c.accent : "transparent" }}
            >
              <Text
                className="font-sans-medium text-sm"
                style={{ color: active ? c.bg : c.text3 }}
              >
                {t("plans.period." + p)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {(["pro", "studio"] as Tier[]).map((tier) => {
        const key = tier + ":" + period;
        const pkg = packages[key];
        if (!pkg) return null;
        const isCurrent = currentTier === tier;
        const perks = t("landing.pricing.tiers." + tier + ".perks", {
          returnObjects: true,
        }) as unknown as string[];

        return (
          <View
            key={tier}
            className="gap-3 rounded-xl border p-5"
            style={{
              borderColor: isCurrent ? c.accent : c.border,
              backgroundColor: isCurrent ? alpha(c.accent, 0.05) : c.surface,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="font-display text-text"
                style={{ fontSize: 22, letterSpacing: -0.6 }}
              >
                {t("landing.pricing.tiers." + tier + ".name")}
              </Text>
              {isCurrent && (
                <Meta variant="cintillo" tone="inherit" style={{ color: c.accent }}>
                  {t("plans.current")}
                </Meta>
              )}
            </View>

            {/* Precio de la tienda, con su moneda y su formato. */}
            <View className="flex-row items-baseline gap-2">
              <Figure size={30}>{pkg.product.priceString}</Figure>
              <Meta tone="faint">{t("plans.cadence." + period)}</Meta>
            </View>

            <Meta variant="cintillo" tone="muted">
              {t("landing.pricing.tiers." + tier + ".inheritsFrom")}
            </Meta>
            <View className="gap-1.5">
              {(Array.isArray(perks) ? perks : []).slice(0, 5).map((perk, i) => (
                <View key={i} className="flex-row gap-2">
                  <Check size={14} color={c.accent} style={{ marginTop: 2 }} />
                  <Text className="flex-1 font-sans text-sm text-text-2">{perk}</Text>
                </View>
              ))}
            </View>

            {isCurrent ? null : (
              <Pressable
                onPress={() => void buy(key)}
                disabled={busy !== null}
                accessibilityRole="button"
                className="items-center rounded-md py-3"
                style={{ backgroundColor: c.accent, opacity: busy ? 0.6 : 1 }}
              >
                {busy === key ? (
                  <ActivityIndicator color={c.bg} />
                ) : (
                  <Text className="font-sans-semibold text-sm" style={{ color: c.bg }}>
                    {t("plans.choose", {
                      plan: t("landing.pricing.tiers." + tier + ".name"),
                    })}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}

      <Pressable
        onPress={() => void restore()}
        disabled={busy !== null}
        accessibilityRole="button"
        className="items-center py-2"
      >
        <Text className="font-sans-medium text-sm" style={{ color: c.accent }}>
          {t("plans.restore")}
        </Text>
      </Pressable>

      {/* Apple exige decir que se renueva sola y enlazar términos y privacidad
          desde la misma pantalla donde se cobra. No es opcional. */}
      <Text className="font-sans text-xs leading-snug text-text-5">
        {t("plans.autoRenewDisclosure")}
      </Text>
      <View className="flex-row gap-4">
        {(["terms", "privacy"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() =>
              void WebBrowser.openBrowserAsync(
                k === "terms"
                  ? "https://continuu.it/terms"
                  : "https://continuu.it/privacy"
              )
            }
          >
            <Text className="font-sans text-xs underline" style={{ color: c.text3 }}>
              {t("settings.legal." + k)}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
