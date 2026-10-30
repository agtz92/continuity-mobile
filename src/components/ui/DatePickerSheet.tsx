import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toLocalISO } from "@/lib/date";
import { SIZE } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemeColors } from "@/theme/useThemeColors";

function parseLocalISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/**
 * Selector de fecha **controlado** sobre un `YYYY-MM-DD` (calendario en hoja
 * en iOS, diálogo del sistema en Android), sin disparador propio: los
 * formularios ponen el suyo (botón calendario de 40 en task-form). `DateInput`
 * es el campo de 48 px sobre `surface` para los demás casos.
 */
export function DatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  title,
  clearable = false,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  title?: string;
  clearable?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { effective } = useTheme();
  const themeVariant = effective === "light" ? "light" : "dark";
  const [draft, setDraft] = useState<Date>(() =>
    value ? parseLocalISO(value) : new Date()
  );

  useEffect(() => {
    if (visible) setDraft(value ? parseLocalISO(value) : new Date());
  }, [visible, value]);

  if (Platform.OS === "android") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft}
        mode="date"
        display="default"
        onChange={(event: DateTimePickerEvent, selected?: Date) => {
          onClose();
          if (event.type === "set" && selected) onChange(toLocalISO(selected));
        }}
      />
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View className="flex-row" style={{ gap: 12 }}>
          {clearable && (
            <Pressable
              onPress={() => {
                onChange("");
                onClose();
              }}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-lg border border-border bg-surface"
              style={{ height: SIZE.button }}
            >
              <Text className="font-sans-medium" style={{ fontSize: 16, color: c.text2 }}>
                {t("common.clear")}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              onChange(toLocalISO(draft));
              onClose();
            }}
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-lg bg-accent"
            style={{ height: SIZE.button }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
              {t("common.done")}
            </Text>
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
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </BottomSheet>
  );
}

/**
 * Disparador tipo input (48 px, fondo `surface`) con icono de calendario.
 * Para campos de fecha lado a lado (Starts / Ends del formulario de rutina).
 */
export function DateInput({
  value,
  onChange,
  title,
  placeholder,
  clearable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const { i18n } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const label = value
    ? parseLocalISO(value).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : placeholder ?? "";
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${label}`}
        className="flex-row items-center justify-between rounded-lg border border-border bg-surface active:opacity-70"
        style={{ height: SIZE.input, paddingHorizontal: 14, gap: 8 }}
      >
        <Text
          className="font-sans min-w-0 flex-shrink"
          numberOfLines={1}
          style={{ fontSize: 16, color: value ? c.text : c.text5 }}
        >
          {label}
        </Text>
        <Calendar size={18} color={c.text3} />
      </Pressable>
      <DatePickerSheet
        visible={open}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
        title={title}
        clearable={clearable}
      />
    </>
  );
}
