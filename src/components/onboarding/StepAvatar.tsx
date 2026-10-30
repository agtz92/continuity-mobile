import { memo, useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Meta } from "@/components/ui/Meta";
import { FilterChips } from "@/components/ui/FilterChips";
import {
  AVATAR_CATALOG,
  AVATAR_STYLES,
  avatarsByStyle,
  getAvatarUrl,
  type Avatar,
  type AvatarStyle,
} from "@/lib/avatars";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton, StepHeading, StepLayout } from "./controls";

const CELL = 64;

const AvatarCell = memo(function AvatarCell({
  avatar,
  selected,
  label,
  onToggle,
}: {
  avatar: Avatar;
  selected: boolean;
  label: string;
  onToggle: (id: string) => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => onToggle(avatar.id)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      className="items-center active:opacity-70"
      style={{ width: "25%", paddingVertical: 6, gap: 6 }}
    >
      <Image
        source={{ uri: getAvatarUrl(avatar.id) }}
        style={{
          width: CELL,
          height: CELL,
          borderRadius: CELL / 2,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.accent : c.line[14],
          backgroundColor: c.surface,
        }}
      />
      <Text
        className={selected ? "font-sans-semibold" : "font-sans-medium"}
        style={{ fontSize: 12, color: selected ? c.text : c.text3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * Paso 3 — avatar picker. El catálogo es el de siempre (`lib/avatars`: siete
 * personajes × cuatro estilos); lo nuevo es el layout: el estilo se elige con
 * chips y la rejilla enseña los siete de ese estilo en celdas de 64 px, con
 * borde accent de 2 px en el activo. Debajo, la fila de confirmación
 * "Nombre · Avatar · Plan". Selection is local and only committed on Next (the
 * flow persists it via updateProfile). Avatar is optional — Next proceeds with
 * whatever is selected (or null if untouched), matching the web StepAvatar.
 */
export function StepAvatar({
  name,
  planLabel,
  initialAvatar,
  busy,
  onNext,
}: {
  name: string;
  planLabel: string;
  initialAvatar: string | null;
  busy: boolean;
  onNext: (avatarId: string | null) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const grouped = avatarsByStyle();
  const [selected, setSelected] = useState<string | null>(initialAvatar);
  const [style, setStyle] = useState<AvatarStyle>(
    () => AVATAR_CATALOG.find((a) => a.id === initialAvatar)?.style ?? AVATAR_STYLES[0],
  );

  const toggle = useCallback((id: string) => {
    setSelected((cur) => (cur === id ? null : id));
  }, []);

  const picked = AVATAR_CATALOG.find((a) => a.id === selected) ?? null;
  const confirmMeta = [picked ? t(`avatars.names.${picked.nameKey}`) : null, planLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <StepLayout
      footer={<PrimaryButton label={t("onboarding.next")} onPress={() => onNext(selected)} busy={busy} />}
    >
      <StepHeading title={t("onboarding.avatar.heading", { name })} sub={t("onboarding.avatar.sub")} />

      <View style={{ gap: 12 }}>
        <FilterChips
          items={AVATAR_STYLES.map((s) => ({ key: s, label: t(`avatars.styles.${s}`) }))}
          value={style}
          onChange={setStyle}
        />
        <View className="flex-row flex-wrap" accessibilityRole="radiogroup">
          {grouped[style].map((a) => (
            <AvatarCell
              key={a.id}
              avatar={a}
              selected={a.id === selected}
              label={t(`avatars.names.${a.nameKey}`)}
              onToggle={toggle}
            />
          ))}
        </View>
      </View>

      {/* Confirmación: así se verá junto a tu nombre. */}
      <View
        className="flex-row items-center"
        style={{ gap: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line[14] }}
      >
        {picked ? (
          <Image
            source={{ uri: getAvatarUrl(picked.id) }}
            style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: c.accent }}
          />
        ) : (
          <View
            className="items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: c.line[22], backgroundColor: c.surface }}
          >
            <Text className="font-display" style={{ fontSize: 20, color: c.text3 }}>
              {(name.trim()[0] ?? "·").toUpperCase()}
            </Text>
          </View>
        )}
        <View className="min-w-0 flex-1" style={{ gap: 2 }}>
          {name ? (
            <Text className="font-sans-semibold" style={{ fontSize: 17, color: c.text }}>
              {name}
            </Text>
          ) : null}
          <Meta variant="cintillo" tone="muted">
            {confirmMeta}
          </Meta>
        </View>
      </View>
    </StepLayout>
  );
}
