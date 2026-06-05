import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIFICATIONS_QUERY } from "@/lib/graphql";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type Severity = "info" | "warn" | "error";

type InAppNotification = {
  id: string;
  kind: string;
  severity: Severity;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  dismissible: boolean;
  i18nKind: string | null;
  i18nVarsJson: string | null;
};

const DISMISS_KEY = "continuity.dismissedNotifications";

/**
 * In-app banners for admin announcements + derived alerts (e.g. plan quota),
 * mirroring the web's NotificationStack. Reads the same NOTIFICATIONS_QUERY,
 * polls every 60s, and persists per-device dismissals in AsyncStorage. Mounted
 * at the top of the Today screen.
 */
export function NotificationStack() {
  const { data } = useQuery<{ notifications: InAppNotification[] }>(
    NOTIFICATIONS_QUERY,
    { fetchPolicy: "cache-and-network", pollInterval: 60_000 },
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setDismissed(new Set(JSON.parse(raw) as string[]));
      } catch {
        /* ignore corrupt value */
      }
    });
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      void AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const items = (data?.notifications ?? []).filter(
    (n) => !n.dismissible || !dismissed.has(n.id),
  );

  if (items.length === 0) return null;

  return (
    <View className="gap-2">
      {items.map((n) => (
        <NotificationCard key={n.id} n={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </View>
  );
}

function NotificationCard({
  n,
  onDismiss,
}: {
  n: InAppNotification;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { title, body, ctaLabel, ctaUrl } = resolveCopy(n, t);
  const palette = severityPalette(n.severity, c);
  const Icon = severityIcon(n.severity);

  const onCta = () => {
    if (!ctaUrl) return;
    if (/^https?:\/\//.test(ctaUrl)) {
      void Linking.openURL(ctaUrl).catch(() => {});
    } else {
      // Internal app route (e.g. "/tasks"). Best-effort.
      router.push(ctaUrl as never);
    }
  };

  return (
    <View
      className="flex-row items-start gap-3 rounded-lg border p-3"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <Icon size={18} color={palette.accent} style={{ marginTop: 1 }} />
      <View className="min-w-0 flex-1">
        {!!title && (
          <Text className="text-sm font-semibold" style={{ color: c.text }}>
            {title}
          </Text>
        )}
        {!!body && (
          <Text className="mt-0.5 text-sm leading-snug text-text-muted">
            {body}
          </Text>
        )}
        {!!ctaUrl && !!ctaLabel && (
          <Pressable onPress={onCta} hitSlop={6} className="mt-2 self-start">
            <Text
              className="text-sm font-medium underline"
              style={{ color: palette.accent }}
            >
              {ctaLabel}
            </Text>
          </Pressable>
        )}
      </View>
      {n.dismissible && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("notifications.dismiss")}
        >
          <X size={16} color={palette.accent} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Announcements carry literal admin copy; quota notifications are derived from
 * an i18n key + interpolation vars. Mirrors the web resolver.
 */
function resolveCopy(
  n: InAppNotification,
  t: (key: string, vars?: Record<string, string | number>) => string,
): { title: string; body: string; ctaLabel: string; ctaUrl: string } {
  const isDerived =
    (n.kind === "quota_over" || n.kind === "quota_will_exceed") && n.i18nKind;
  if (!isDerived) {
    return {
      title: n.title,
      body: n.body,
      ctaLabel: n.ctaLabel,
      ctaUrl: n.ctaUrl,
    };
  }
  let vars: Record<string, string | number> = {};
  try {
    vars = n.i18nVarsJson ? JSON.parse(n.i18nVarsJson) : {};
  } catch {
    vars = {};
  }
  if (typeof vars.date_iso === "string" && vars.date_iso) {
    try {
      vars.date = new Date(vars.date_iso).toLocaleDateString();
    } catch {
      vars.date = vars.date_iso;
    }
  }
  const baseSection =
    n.kind === "quota_will_exceed" ? "quotaWillExceed" : "quotaOver";
  const baseKey = `notifications.${baseSection}.${n.i18nKind}`;
  const safe = (k: string) => {
    const full = `${baseKey}.${k}`;
    const out = t(full, vars);
    return out === full ? "" : out;
  };
  // Map the quota kind to the equivalent mobile route.
  const routeByKind: Record<string, string> = {
    projects: "/projects",
    tasks_total: "/tasks",
    routines: "/routines",
    ideas: "/ideas",
    categories: "/profile",
  };
  return {
    title: safe("title"),
    body: safe("body"),
    ctaLabel: safe("cta"),
    ctaUrl: routeByKind[n.i18nKind!] ?? "/today",
  };
}

function severityPalette(
  severity: Severity,
  c: ReturnType<typeof useThemeColors>,
) {
  switch (severity) {
    case "error":
      return {
        bg: "rgba(239,68,68,0.1)",
        border: "rgba(239,68,68,0.3)",
        accent: "rgb(248,113,113)",
      };
    case "warn":
      return {
        bg: "rgba(245,158,11,0.1)",
        border: "rgba(245,158,11,0.3)",
        accent: "rgb(251,191,36)",
      };
    case "info":
    default:
      return {
        bg: alpha(c.accent, 0.08),
        border: alpha(c.accent, 0.3),
        accent: c.accent,
      };
  }
}

function severityIcon(severity: Severity): LucideIcon {
  switch (severity) {
    case "error":
      return XCircle;
    case "warn":
      return AlertTriangle;
    case "info":
    default:
      return Info;
  }
}
