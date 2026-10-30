import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, InfinityIcon } from "lucide-react-native";

import { IconAction } from "@/components/ui/IconAction";
import { Meta } from "@/components/ui/Meta";
import { ScreenTitle } from "@/components/ui/ScreenTitle";

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 19) return "afternoon";
  return "evening";
}

/**
 * Cabecera de Hoy: fecha en cintillo, saludo como titular y dos acciones de
 * 44 px — Loop (círculo con relleno) y Personalizar. Antes Loop era una
 * píldora con texto que empujaba el saludo a dos líneas.
 */
export function TodayHeader({ onCustomize }: { onCustomize: () => void }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const formattedDate = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        {/* "Cuándo" y luego "quién eres hoy". */}
        <Meta variant="cintillo" tone="muted" className="capitalize">
          {formattedDate}
        </Meta>
        <ScreenTitle className="mt-1">{t(`views.today.greeting.${greetingKey()}`)}</ScreenTitle>
      </View>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <IconAction
          icon={InfinityIcon}
          label={t("assistant.openTooltip")}
          onPress={() => router.push("/assistant")}
          tone="accent"
          filled
        />
        <IconAction
          icon={SlidersHorizontal}
          label={t("views.today.customize.entry")}
          onPress={onCustomize}
        />
      </View>
    </View>
  );
}
