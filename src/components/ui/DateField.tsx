import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { Calendar, X } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toLocalISO } from "@/lib/date";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemeColors } from "@/theme/useThemeColors";

function parseLocalISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/**
 * Native date picker over a `YYYY-MM-DD` string. The trigger looks like an input
 * row; tapping it opens the platform picker — a calendar inside a bottom sheet on
 * iOS (so we can show Done/Clear), the system dialog on Android. Empty `value`
 * means "no date"; pass `clearable` to allow returning to that state.
 */
export function DateField({
  value,
  onChange,
  title,
  placeholder,
  clearable = false,
  minimumDate,
  maximumDate,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Sheet header (iOS). */
  title?: string;
  /** Shown on the trigger when no date is set. */
  placeholder?: string;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const { effective } = useTheme();
  const themeVariant = effective === "light" ? "light" : "dark";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() =>
    value ? parseLocalISO(value) : new Date()
  );

  const label = value
    ? parseLocalISO(value).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : placeholder ?? "YYYY-MM-DD";

  const openPicker = () => {
    setDraft(value ? parseLocalISO(value) : new Date());
    setOpen(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === "set" && selected) onChange(toLocalISO(selected));
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-lg border border-border bg-border px-3 py-2.5"
      >
        <Text className={"text-base " + (value ? "text-text" : "text-text-muted")}>{label}</Text>
        <View className="flex-row items-center gap-2">
          {clearable && !!value && (
            <Pressable
              onPress={() => onChange("")}
              hitSlop={8}
              accessibilityLabel={t("common.clear")}
            >
              <X size={16} color={c.textMuted} />
            </Pressable>
          )}
          <Calendar size={18} color={c.textMuted} />
        </View>
      </Pressable>

      {Platform.OS === "android" && open && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS !== "android" && (
        <BottomSheet
          visible={open}
          onClose={() => setOpen(false)}
          title={title}
          footer={
            <View className="flex-row gap-3">
              {clearable && (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex-1 items-center rounded-lg border border-border bg-surface py-3"
                >
                  <Text className="text-base font-medium text-text-muted">
                    {t("common.clear")}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  onChange(toLocalISO(draft));
                  setOpen(false);
                }}
                className="flex-1 items-center rounded-lg bg-accent py-3"
              >
                <Text className="text-base font-medium text-bg">{t("common.done")}</Text>
              </Pressable>
            </View>
          }
        >
          <View className="items-center">
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              themeVariant={themeVariant}
              accentColor={c.accent}
              onChange={(_, selected) => selected && setDraft(selected)}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={{ alignSelf: "stretch" }}
            />
          </View>
        </BottomSheet>
      )}
    </>
  );
}
