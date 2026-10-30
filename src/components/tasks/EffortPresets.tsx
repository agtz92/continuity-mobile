import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { PresetChips, type PresetOption } from "@/components/ui/PresetChips";
import { FormInput } from "@/components/ui/FormInput";

const PRESETS = [
  { value: "0.25", label: "¼h" },
  { value: "0.5", label: "½h" },
  { value: "1", label: "1h" },
  { value: "2", label: "2h" },
  { value: "4", label: "4h" },
] as const;
const CUSTOM = "custom";
type EffortValue = (typeof PRESETS)[number]["value"] | typeof CUSTOM;

const isPreset = (v: string) => PRESETS.some((p) => p.value === v);

/**
 * Texto del esfuerzo para el `aside` del label ("2 hours", "30 minutes").
 * Devuelve null si no hay un número válido.
 */
export function useEffortAside(raw: string): string | null {
  const { t } = useTranslation();
  const n = raw.trim() ? parseFloat(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1) return t("modals.task.effortMinutes", { count: Math.round(n * 60) });
  return t("modals.task.effortHours", { count: n });
}

/**
 * Esfuerzo en presets de 40 px: ¼h ½h 1h 2h 4h + "…", que abre un input libre
 * (decimal). Tocar el preset activo lo quita. `value` es el string del input
 * de horas, igual que antes en los formularios.
 */
export function EffortPresets({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useTranslation();
  const trimmed = value.trim();
  const [custom, setCustom] = useState(() => trimmed !== "" && !isPreset(trimmed));

  const options: PresetOption<EffortValue>[] = [
    ...PRESETS.map((p) => ({
      value: p.value,
      label: p.label,
      accessibilityLabel: `${p.value} h`,
    })),
    { value: CUSTOM, label: "…", accessibilityLabel: t("modals.task.effortCustom") },
  ];
  const selected: EffortValue | null = custom
    ? CUSTOM
    : isPreset(trimmed)
      ? (trimmed as EffortValue)
      : null;

  const pick = (v: EffortValue) => {
    if (v === CUSTOM) {
      setCustom((cur) => !cur);
      return;
    }
    setCustom(false);
    onChange(trimmed === v ? "" : v);
  };

  return (
    <View style={{ gap: 8 }}>
      <PresetChips options={options} value={selected} onChange={pick} />
      {custom ? (
        <FormInput
          value={value}
          onChangeText={onChange}
          placeholder={t("modals.task.effortPlaceholder")}
          accessibilityLabel={t("modals.task.effortCustom")}
          keyboardType="decimal-pad"
          autoFocus
        />
      ) : null}
    </View>
  );
}
