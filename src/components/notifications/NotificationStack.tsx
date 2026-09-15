import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { useFocusEffect, useRouter } from "expo-router";
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

async function loadDismissed(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(DISMISS_KEY).catch(() => null);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set(); // valor corrupto: se trata como "nada descartado"
  }
}

/**
 * In-app banners for admin announcements + derived alerts (e.g. plan quota),
 * mirroring the web's NotificationStack. Reads the same NOTIFICATIONS_QUERY,
 * se re-consulta al enfocar la pestaña y al volver del background (con un poll
 * lento de respaldo), y guarda los descartes por dispositivo en AsyncStorage.
 * Montado arriba de cada pestaña del dashboard, como en web (ahí vive sobre
 * todas las vistas, no solo sobre Today).
 */
export function NotificationStack({ className = "gap-2" }: { className?: string }) {
  const { data, refetch } = useQuery<{ notifications: InAppNotification[] }>(
    NOTIFICATIONS_QUERY,
    // El poll es la red de seguridad, no el camino principal: este componente
    // está montado en las 5 pestañas a la vez y el query cuenta cuotas en el
    // servidor, así que 60s × 5 instancias era pagar de más. Lo que de verdad
    // trae un anuncio nuevo es el refetch de abajo (enfoque / foreground).
    { fetchPolicy: "cache-and-network", pollInterval: 300_000 },
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // El poll no alcanza para lo que de verdad pasa: el admin publica un anuncio
  // (o entra en su ventana `starts_at`) mientras la app está guardada.
  // Al enfocar la pestaña y al volver del background se vuelve a preguntar,
  // que es justo cuando alguien está mirando la pantalla.
  useFocusEffect(
    useCallback(() => {
      void refetch().catch(() => undefined);
      // Relee los descartes: el banner vive en las 5 pestañas y cada instancia
      // tiene su propio estado, así que cerrarlo en una debe callarlo en todas.
      void loadDismissed().then(setDismissed);
    }, [refetch]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refetch]);

  // Con el id versionado (`ann.<uuid>.<rev>`) la lista de descartes crecería
  // sin techo: cada edición del anuncio deja un id muerto. Lo que el servidor
  // ya no manda, se tira. Un anuncio descartado pero vigente SÍ viene en la
  // respuesta, así que esto nunca resucita un banner que alguien cerró.
  useEffect(() => {
    const live = data?.notifications;
    if (!live) return;
    const liveIds = new Set(live.map((n) => n.id));
    setDismissed((prev) => {
      const kept = new Set([...prev].filter((id) => liveIds.has(id)));
      if (kept.size === prev.size) return prev;
      void AsyncStorage.setItem(DISMISS_KEY, JSON.stringify([...kept]));
      return kept;
    });
  }, [data]);

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
    <View className={className}>
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
          <Text className="text-sm font-sans-semibold" style={{ color: c.text }}>
            {title}
          </Text>
        )}
        {!!body && (
          <Text className="font-sans mt-0.5 text-sm leading-snug text-text-muted">
            {body}
          </Text>
        )}
        {!!ctaUrl && !!ctaLabel && (
          <Pressable onPress={onCta} hitSlop={6} className="mt-2 self-start">
            <Text
              className="text-sm font-sans-medium underline"
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
        bg: alpha(c.signal, 0.1),
        border: alpha(c.signal, 0.3),
        accent: c.signal,
      };
    case "warn":
      // Aviso ≠ error. No hay un cuarto color para esto: se dice con el mismo
      // acento y menos peso, y el icono es el que separa uno de otro.
      return {
        bg: alpha(c.accent, 0.1),
        border: alpha(c.accent, 0.3),
        accent: c.accent,
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
