import { useEffect, useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CloudOff } from "lucide-react-native";
import { useOnline } from "@/lib/network";
import { getSyncedAt, subscribeSyncedAt } from "@/lib/cachePersist";
import { useThemeColors } from "@/theme/useThemeColors";
import { lift } from "@/theme/lift";

/**
 * Pastilla "Sin conexión · actualizado hace X" mientras no hay red. Lo que se
 * ve es la caché persistida (`lib/cachePersist.ts`), así que decir de cuándo
 * es importa más que decir que falta la red. No captura toques.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const syncedAt = useSyncExternalStore(subscribeSyncedAt, getSyncedAt);

  // Re-render cada minuto para que el "hace X" avance.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (online) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [online]);

  if (online) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 4,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 55,
      }}
    >
      <View
        className="flex-row items-center gap-1.5 rounded-full border bg-surface px-3 py-1"
        style={{ borderColor: c.border, ...lift("float", c) }}
        accessibilityRole="alert"
      >
        <CloudOff size={13} color={c.text3} />
        <Text className="font-sans-medium text-xs text-text-2">
          {syncedAt
            ? t("offline.bannerSince", { ago: formatAgo(t, syncedAt) })
            : t("offline.banner")}
        </Text>
      </View>
    </View>
  );
}

function formatAgo(t: TFunction, at: number): string {
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return t("notes.justNow");
  if (minutes < 60) return t("notes.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notes.hoursAgo", { count: hours });
  return t("notes.daysAgo", { count: Math.floor(hours / 24) });
}
