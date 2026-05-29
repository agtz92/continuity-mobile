import { useEffect, useRef, useState } from "react";
import { Modal, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  FolderKanban,
  ListChecks,
  Repeat,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";
import { MARK_TOUR, ONBOARDING_STATE_QUERY } from "@/lib/graphql";
import { consumeTourRequest, subscribeTour } from "@/lib/tour";
import { useThemeColors } from "@/theme/useThemeColors";
import { useThemeVars } from "@/theme/ThemeProvider";
import { PrimaryButton, TextButton } from "./controls";

const STEPS: { icon: LucideIcon; key: "step1" | "step2" | "step3" | "step4" }[] = [
  { icon: FolderKanban, key: "step1" },
  { icon: ListChecks, key: "step2" },
  { icon: Repeat, key: "step3" },
  { icon: Sparkles, key: "step4" },
];

/**
 * Native re-design of the web DashboardTour (driver.js). Rather than punching
 * spotlight holes over each tab — fragile across devices — it shows a stack of
 * bottom-anchored coachmark cards describing projects → tasks → routines →
 * assistant, then a final "create your first project" CTA.
 *
 * Triggers: tourStatus === "pending" (first-time, auto) OR a cross-screen
 * requestTour() (the "watch tour again" entries in onboarding replay /
 * appearance). Mounted once as a sibling of the dashboard <Tabs>.
 */
export function DashboardTour() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const themeVars = useThemeVars();

  const { data } = useQuery<{ onboardingState: { tourStatus: string } | null }>(
    ONBOARDING_STATE_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const tourStatus = data?.onboardingState?.tourStatus;
  const [markTour] = useMutation(MARK_TOUR);

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const autoStarted = useRef(false);

  // Cross-screen "watch tour again" requests. consumeTourRequest() catches a
  // flag set before this mounted; subscribeTour() handles live requests.
  useEffect(() => {
    if (consumeTourRequest()) start();
    return subscribeTour(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start for first-time users once the state resolves.
  useEffect(() => {
    if (tourStatus === "pending" && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
  }, [tourStatus]);

  function start() {
    setStep(0);
    setShowFinal(false);
    setActive(true);
  }

  const close = () => {
    setActive(false);
    setShowFinal(false);
    setStep(0);
  };

  const finishSeen = () => {
    void markTour({ variables: { seen: true } });
    close();
  };

  const skip = () => {
    void markTour({ variables: { seen: false } });
    close();
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setShowFinal(true);
    }
  };

  const createFirstProject = () => {
    finishSeen();
    router.push("/project-form");
  };

  if (!active) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View
        style={[
          themeVars,
          {
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.6)",
          },
        ]}
      >
        {showFinal ? (
          <View className="m-4 gap-4 rounded-2xl border border-border bg-surface p-6">
            <Text className="text-2xl font-bold text-text">
              {t("onboarding.tour.finalCta.title")}
            </Text>
            <Text className="text-base leading-relaxed text-text-muted">
              {t("onboarding.tour.finalCta.body")}
            </Text>
            <Text className="text-sm leading-relaxed text-text-muted">
              {t("onboarding.tour.finalCta.more")}
            </Text>
            <PrimaryButton
              label={t("onboarding.tour.finalCta.primary")}
              onPress={createFirstProject}
            />
            <View className="items-center">
              <TextButton
                label={t("onboarding.tour.finalCta.secondary")}
                onPress={finishSeen}
              />
            </View>
          </View>
        ) : (
          <View className="m-4 gap-4 rounded-2xl border border-border bg-surface p-6">
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-full bg-accent"
              >
                <Icon size={20} color={c.bg} />
              </View>
              <Text className="flex-1 text-xl font-bold text-text">
                {t(`onboarding.tour.${current.key}.title`)}
              </Text>
            </View>
            <Text className="text-base leading-relaxed text-text-muted">
              {t(`onboarding.tour.${current.key}.body`)}
            </Text>

            {/* Progress dots */}
            <View className="flex-row gap-2">
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ backgroundColor: i <= step ? c.accent : c.border }}
                />
              ))}
            </View>

            <View className="flex-row items-center justify-between">
              <TextButton label={t("onboarding.tour.skip")} onPress={skip} />
              <PrimaryButton
                label={t("onboarding.tour.next")}
                onPress={next}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
