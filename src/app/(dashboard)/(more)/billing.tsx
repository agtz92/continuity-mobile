import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, ExternalLink } from "lucide-react-native";
import { PlanBadge } from "@/components/assistant/PlanBadge";
import { getUsage, type UsageSnapshot } from "@/lib/assistantApi";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const WEB_BILLING_URL = "https://continuu.it/settings/billing";
const AMBER = "245,158,11";
const AMBER_T = "rgb(251,191,36)";

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function Billing() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  // Refetch each time the screen gains focus so the plan reflects any change the
  // user just made on the web billing page (which we open externally).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUsage()
        .then((u) => {
          if (active) setUsage(u);
        })
        .catch(() => {
          /* assistant backend may be offline — leave usage null */
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const plan = (usage?.plan ?? "free") as "free" | "pro" | "studio" | "admin";
  const cap = usage?.daily_message_cap ?? null;
  const used = usage?.messages_sent_today ?? 0;
  const monthlyCap = usage?.monthly_token_cap ?? null;
  const monthlyUsed = usage?.tokens_used_month ?? 0;
  const isExempt = usage?.is_billing_exempt ?? false;
  const hasSubscription = usage?.has_subscription ?? false;
  const renewsAt = usage?.plan_renews_at ?? null;
  const subscriptionPeriod = usage?.subscription_period ?? null;
  const cancelScheduled = usage?.cancel_at_period_end ?? false;

  const planLabel =
    plan === "studio"
      ? t("settings.billing.studio")
      : plan === "admin"
        ? t("settings.billing.admin")
        : plan === "pro"
          ? t("settings.billing.pro")
          : t("settings.billing.free");

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      {/* Current plan card */}
      <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted">
          {t("settings.billing.currentPlan")}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-text">{planLabel}</Text>
          <PlanBadge plan={plan} />
          {isExempt && (
            <View
              className="rounded-md px-1.5 py-0.5"
              style={{
                backgroundColor: alpha(c.accent, 0.1),
                borderWidth: 1,
                borderColor: alpha(c.accent, 0.4),
              }}
            >
              <Text className="text-[10px] font-semibold uppercase text-accent">
                {t("settings.billing.exemptBadge")}
              </Text>
            </View>
          )}
        </View>

        {isExempt ? (
          <Text className="text-xs text-text-muted">
            {t("settings.billing.exemptBlurb", { plan: planLabel })}
          </Text>
        ) : cancelScheduled && renewsAt ? (
          <View
            className="gap-0.5 rounded-lg px-3 py-2"
            style={{
              backgroundColor: `rgba(${AMBER},0.1)`,
              borderWidth: 1,
              borderColor: `rgba(${AMBER},0.3)`,
            }}
          >
            <View className="flex-row items-center gap-1.5">
              <AlertCircle size={13} color={AMBER_T} />
              <Text className="text-xs font-semibold" style={{ color: AMBER_T }}>
                {t("settings.billing.cancelScheduled")}
              </Text>
            </View>
            <Text className="text-xs leading-snug" style={{ color: AMBER_T }}>
              {t("settings.billing.cancelScheduledBlurb", {
                plan: planLabel,
                date: fmtDate(renewsAt),
                days: daysUntil(renewsAt),
              })}
            </Text>
          </View>
        ) : plan === "free" ? (
          <Text className="text-xs text-text-muted">
            {t("settings.billing.freeBlurb")}
          </Text>
        ) : renewsAt ? (
          <Text className="text-xs text-text-muted">
            {t("settings.billing.renewsAtWithDays", {
              date: fmtDate(renewsAt),
              days: daysUntil(renewsAt),
            })}
          </Text>
        ) : null}

        {subscriptionPeriod && !isExempt && (
          <Text className="text-xs text-text-muted">
            {subscriptionPeriod === "annual"
              ? t("settings.billing.billingPeriod.currentAnnual")
              : t("settings.billing.billingPeriod.currentMonthly")}
          </Text>
        )}

        {/* Usage rows */}
        <View className="mt-1 gap-2">
          <UsageRow
            label={t("assistant.usage.dailyMessages")}
            value={cap == null ? `${used}` : `${used} / ${cap}`}
          />
          <UsageRow
            label={t("assistant.usage.monthlyTokens")}
            value={
              monthlyCap == null
                ? formatNumber(monthlyUsed)
                : `${formatNumber(monthlyUsed)} / ${formatNumber(monthlyCap)}`
            }
          />
        </View>
      </View>

      {/* Manage on web — Apple rules: no prices, no subscribe CTA in-app. */}
      {!isExempt && (
        <Pressable
          onPress={() => void Linking.openURL(WEB_BILLING_URL)}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-4 active:opacity-80"
        >
          <ExternalLink size={16} color={c.text} />
          <Text className="text-base font-semibold text-text">
            {hasSubscription
              ? t("settings.billing.manageSubscription")
              : t("settings.billing.upgrade")}
          </Text>
        </Pressable>
      )}
      <Text className="px-1 text-center text-xs text-text-muted">
        {t("settings.billing.manageOnWebHint")}
      </Text>
    </ScrollView>
  );
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5">
      <Text className="text-xs text-text-muted">{label}</Text>
      <Text className="text-sm font-medium text-text">{value}</Text>
    </View>
  );
}
