import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronRight, HeartPulse, RefreshCw } from "lucide-react-native";

import { Meta } from "@/components/ui/Meta";
import type { Project } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

const DAY = 1000 * 60 * 60 * 24;

/** Nota de cierre: label en versalitas sobre su texto. Vacía = no existe. */
function ClosureNote({ label, body }: { label: string; body: string }) {
  const c = useThemeColors();
  if (!body.trim()) return null;
  return (
    <View style={{ gap: 4 }}>
      <Meta variant="cintillo" tone="muted">
        {label}
      </Meta>
      <Text className="font-sans" style={{ fontSize: 15, lineHeight: 22, color: c.text }}>
        {body}
      </Text>
    </View>
  );
}

/**
 * Un proyecto enterrado (3d) como bloque rayado, sin tarjeta: título 22 px,
 * meta "Lived N days · killed <fecha>", las notas de cierre y, al pie,
 * **Revive** (44) + un disclosure con la reflexión de Loop si existe.
 */
export const GraveBlock = memo(function GraveBlock({
  project: p,
  locale,
  onRevive,
  disabled,
}: {
  project: Project;
  locale: string;
  onRevive: (p: Project) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [showReflection, setShowReflection] = useState(false);

  const end = p.killedAt ? new Date(p.killedAt).getTime() : Date.now();
  const lived = Math.max(0, Math.floor((end - new Date(p.created).getTime()) / DAY));
  const killedOn = p.killedAt
    ? new Date(p.killedAt).toLocaleDateString(locale, { month: "short", day: "numeric" })
    : null;
  const wouldRestart = !!(p.killedWouldRestart ?? "").trim();
  const reflection = (p.killedAiReflection ?? "").trim();

  return (
    <View style={{ paddingVertical: 20, gap: 14, borderTopWidth: 1, borderTopColor: c.line[14] }}>
      <View style={{ gap: 6 }}>
        <Text
          className="font-display"
          style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.5, color: c.text }}
        >
          {p.name}
        </Text>
        <View className="flex-row flex-wrap items-center" style={{ columnGap: 6, rowGap: 2 }}>
          <Meta variant="cintillo" tone="muted">
            {t("views.graveyard.lived", { count: lived })}
            {killedOn ? ` · ${t("views.graveyard.killedOn", { date: killedOn })}` : ""}
          </Meta>
          {wouldRestart ? (
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Meta variant="cintillo" tone="muted">
                ·
              </Meta>
              <RefreshCw size={11} color={c.accent} />
              <Meta variant="cintillo" tone="inherit" style={{ color: c.accent }}>
                {t("views.graveyard.wouldRestartBadge")}
              </Meta>
            </View>
          ) : null}
        </View>
      </View>

      <ClosureNote label={t("views.graveyard.whyKilled")} body={p.killedReason ?? ""} />
      <ClosureNote label={t("views.graveyard.learnings")} body={p.killedLearnings ?? ""} />
      <ClosureNote label={t("views.graveyard.wouldRestart")} body={p.killedWouldRestart ?? ""} />
      {reflection && showReflection ? (
        <ClosureNote label={t("views.graveyard.loopReflection")} body={reflection} />
      ) : null}

      <View className="flex-row items-center" style={{ gap: 16 }}>
        <Pressable
          onPress={() => onRevive(p)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${t("views.graveyard.revive")}: ${p.name}`}
          className="flex-row items-center rounded-md active:opacity-70"
          style={{
            height: SIZE.hit,
            paddingHorizontal: 14,
            gap: 8,
            borderWidth: 1,
            borderColor: c.line[22],
            backgroundColor: c.surface,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <HeartPulse size={18} color={c.accent} />
          <Text className="font-sans-medium" style={{ fontSize: 15, color: c.accent }}>
            {t("views.graveyard.revive")}
          </Text>
        </Pressable>
        {reflection ? (
          <Pressable
            onPress={() => setShowReflection((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showReflection }}
            accessibilityLabel={t("views.graveyard.loopReflection")}
            className="flex-row items-center active:opacity-60"
            style={{ minHeight: SIZE.hit, gap: 6 }}
          >
            <View style={{ transform: [{ rotate: showReflection ? "90deg" : "0deg" }] }}>
              <ChevronRight size={16} color={c.text3} />
            </View>
            <Text className="font-sans" style={{ fontSize: 15, color: c.text2 }}>
              {t("views.graveyard.loopReflection")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});
