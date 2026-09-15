import { useEffect, useRef, useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  COMPLETE_ONBOARDING,
  MARK_TOUR,
  ONBOARDING_STATE_QUERY,
  SET_ONBOARDING_STEP,
  UPDATE_NOTIFICATION_SETTINGS,
  UPDATE_PROFILE,
} from "@/lib/graphql";
import { supabase } from "@/lib/supabase";
import { requestCustomize, requestTour } from "@/lib/tour";
import { useThemeColors } from "@/theme/useThemeColors";
import { TextButton } from "@/components/onboarding/controls";
import { StepTheme } from "@/components/onboarding/StepTheme";
import { StepName } from "@/components/onboarding/StepName";
import { StepAvatar } from "@/components/onboarding/StepAvatar";
import { StepPlan } from "@/components/onboarding/StepPlan";
import { StepCustomize } from "@/components/onboarding/StepCustomize";

const TOTAL_STEPS = 5;

type OnboardingState = {
  status: string;
  currentStep: number;
  tourStatus: string;
  firstName: string | null;
  avatar: string | null;
  plan: string | null;
  isBillingExempt: boolean;
};

const clampStep = (n: number) => Math.min(TOTAL_STEPS, Math.max(1, n || 1));

/** First whitespace-token of the Google display name, capped at 50 chars. */
function firstNameFromMetadata(meta: Record<string, unknown> | undefined): string {
  const full = (meta?.full_name ?? meta?.name) as string | undefined;
  if (!full) return "";
  return (full.trim().split(/\s+/)[0] ?? "").slice(0, 50);
}

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<{ replay?: string }>();
  const replay = params.replay === "true" || params.replay === "1";

  const { data, loading } = useQuery<{ onboardingState: OnboardingState }>(
    ONBOARDING_STATE_QUERY,
    { fetchPolicy: "network-only" },
  );
  const state = data?.onboardingState;

  const [setOnboardingStep] = useMutation(SET_ONBOARDING_STEP);
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [updateSettings] = useMutation(UPDATE_NOTIFICATION_SETTINGS);
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING, {
    // Block until the state query reflects "completed" so the root gate doesn't
    // briefly see stale "in_progress" and bounce us back to /onboarding.
    awaitRefetchQueries: true,
    refetchQueries: [{ query: ONBOARDING_STATE_QUERY }],
  });
  const [markTour] = useMutation(MARK_TOUR, {
    // Block until cache reflects the skipped tour so the DashboardTour overlay
    // (mounted in the (dashboard) layout) doesn't auto-start over the editor.
    awaitRefetchQueries: true,
    refetchQueries: [{ query: ONBOARDING_STATE_QUERY }],
  });

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [oauthName, setOauthName] = useState("");
  const [busy, setBusy] = useState(false);
  const resolved = useRef(false);

  // Pull the Google display name once (only used as a Step 1 prefill fallback).
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: s }) => {
      const meta = s.session?.user?.user_metadata as
        | Record<string, unknown>
        | undefined;
      const first = firstNameFromMetadata(meta);
      if (first) setOauthName(first);
    });
  }, []);

  // Resume: decide the starting step once the server state lands. Replay always
  // restarts at step 1; an already-finished (non-replay) user skips to the app.
  useEffect(() => {
    if (loading || !state || resolved.current) return;
    resolved.current = true;
    if (replay) {
      setName(state.firstName ?? "");
      setStep(1);
      return;
    }
    if (state.status === "completed" || state.status === "skipped") {
      router.replace("/today");
      return;
    }
    setName(state.firstName ?? "");
    setStep(clampStep(state.currentStep));
  }, [loading, state, replay, router]);

  const goToStep = async (next: number) => {
    setStep(next);
    if (!replay) {
      try {
        await setOnboardingStep({ variables: { step: next } });
      } catch {
        /* non-fatal — errorLink toasts; local step already advanced */
      }
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      if (!replay) {
        await completeOnboarding({ variables: { mode: "finished" } });
      }
      router.replace("/today");
    } catch {
      setBusy(false); // errorLink surfaced a toast; let the user retry
    }
  };

  const skipAll = async () => {
    setBusy(true);
    try {
      if (!replay) {
        await completeOnboarding({ variables: { mode: "skipped" } });
      }
      router.replace("/today");
    } catch {
      setBusy(false);
    }
  };

  const watchTour = () => {
    requestTour();
    router.replace("/today");
  };

  // Acción principal del paso 5: completar y abrir el editor del Today.
  // First-time runs also skip the tour so the editor doesn't share the screen
  // with the spotlight; replay leaves tour state untouched.
  const finishWithCustomize = async () => {
    setBusy(true);
    try {
      if (!replay) {
        await completeOnboarding({ variables: { mode: "finished" } });
        await markTour({ variables: { seen: false } }).catch(() => undefined);
      }
      requestCustomize();
      router.replace("/today");
    } catch {
      setBusy(false); // errorLink surfaced a toast; let the user retry
    }
  };

  // Paso 2 → guardar nombre, avanzar.
  const handleName = async (value: string) => {
    setBusy(true);
    setName(value);
    try {
      await updateProfile({ variables: { firstName: value } });
    } catch {
      /* non-fatal */
    }
    setBusy(false);
    void goToStep(3);
  };

  // Paso 1 → persistir tema/paleta (ya aplicados en vivo), avanzar.
  const handleTheme = async (v: { theme: string; palette: string }) => {
    setBusy(true);
    try {
      await updateSettings({
        variables: { data: { theme: v.theme, palette: v.palette } },
      });
    } catch {
      /* non-fatal */
    }
    setBusy(false);
    void goToStep(2);
  };

  // Paso 3 → guardar avatar (si eligió), avanzar.
  const handleAvatar = async (avatarId: string | null) => {
    setBusy(true);
    if (avatarId) {
      try {
        await updateProfile({ variables: { avatar: avatarId } });
      } catch {
        /* non-fatal */
      }
    }
    setBusy(false);
    void goToStep(4);
  };

  const planLabel = (() => {
    const plan = state?.plan ?? "free";
    if (plan === "studio") return t("settings.billing.studio");
    if (plan === "admin") return t("settings.billing.admin");
    if (plan === "pro") return t("settings.billing.pro");
    return t("settings.billing.free");
  })();

  if (loading || !state) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      {/* Header: progress label + skip (skip hidden in replay) */}
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Meta variant="cintillo" tone="muted">
          {t("onboarding.progress", { current: step, total: TOTAL_STEPS })}
        </Meta>
        {!replay && (
          <TextButton
            label={t("onboarding.skip")}
            onPress={() => void skipAll()}
            disabled={busy}
          />
        )}
      </View>

      {/* Progress dots */}
      <View className="flex-row gap-2 px-5 pb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const idx = i + 1;
          const done = idx <= step;
          return (
            <View
              key={idx}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: done ? c.accent : c.border }}
            />
          );
        })}
      </View>

      {replay && (
        <View className="mx-5 mb-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Text className="font-sans text-xs text-text-muted">
            {t("onboarding.replay.banner")}
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <StepTheme busy={busy} onNext={(v) => void handleTheme(v)} />
        )}
        {step === 2 && (
          <StepName
            initialName={name || oauthName}
            prefilled={!name && !!oauthName}
            busy={busy}
            onNext={(v) => void handleName(v)}
          />
        )}
        {step === 3 && (
          <StepAvatar
            name={name}
            initialAvatar={state.avatar ?? null}
            busy={busy}
            onNext={(id) => void handleAvatar(id)}
          />
        )}
        {step === 4 && (
          <StepPlan
            name={name}
            planLabel={planLabel}
            isExempt={state.isBillingExempt}
            replay={replay}
            busy={busy}
            onContinue={() => void goToStep(5)}
          />
        )}
        {step === 5 && (
          <StepCustomize
            replay={replay}
            busy={busy}
            onCustomize={() => void finishWithCustomize()}
            onFinish={() => void finish()}
            onWatchTour={watchTour}
          />
        )}

        {/* Back link on steps 2–5 (replay too). */}
        {step > 1 && (
          <View className="mt-6 items-center">
            <TextButton
              label={t("onboarding.back")}
              onPress={() => void goToStep(step - 1)}
              disabled={busy}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
