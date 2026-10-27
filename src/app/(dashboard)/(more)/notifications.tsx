import { Meta } from "@/components/ui/Meta";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import { getCalendars } from "expo-localization";
import { MapPin, Smartphone } from "lucide-react-native";
import {
  NOTIFICATION_SETTINGS_QUERY,
  UPDATE_NOTIFICATION_SETTINGS,
} from "@/lib/graphql";
import { toast } from "@/lib/toast";
import { Field } from "@/components/ui/Field";
import { Select, type SelectOption } from "@/components/settings/Select";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type Settings = {
  locale: string;
  timezone: string;
  digestEnabled: boolean;
  digestDayOfWeek: number;
  digestHour: number;
  dailyDigestEnabled: boolean;
  dailyDigestHour: number;
  sleepingAlertsEnabled: boolean;
  dueRemindersEnabled: boolean;
  dueReminderHour: number;
  manualEnabled: boolean;
  isAdmin: boolean;
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const hourOptions = (): SelectOption[] =>
  Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: `${String(h).padStart(2, "0")}:00`,
  }));

export default function Notifications() {
  const { t } = useTranslation();
  const c = useThemeColors();

  const { data, loading } = useQuery<{ notificationSettings: Settings }>(
    NOTIFICATION_SETTINGS_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const [updateSettings, { loading: saving }] = useMutation(
    UPDATE_NOTIFICATION_SETTINGS,
    {
      // NotificationSettingsType has no id, so Apollo can't auto-merge. Write
      // the result into the query cache ourselves so the UI stays in sync.
      update: (cache, { data }) => {
        const next = (data as { updateNotificationSettings?: Settings } | null)
          ?.updateNotificationSettings;
        if (next) {
          cache.writeQuery({
            query: NOTIFICATION_SETTINGS_QUERY,
            data: { notificationSettings: next },
          });
        }
      },
    },
  );
  const settings = data?.notificationSettings;

  if (loading && !settings) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (!settings) return null;

  const onSave = async (patch: Partial<Settings>) => {
    try {
      await updateSettings({ variables: { data: patch } });
      toast.success(t("common.saved"));
    } catch {
      /* error link surfaces a toast */
    }
  };

  const deviceTz = getCalendars()[0]?.timeZone ?? null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      {/* Channels */}
      <Section title={t("settings.notifications.channels")}>
        <View className="flex-row items-start gap-2">
          <Smartphone size={16} color={c.textMuted} style={{ marginTop: 1 }} />
          <Text className="font-sans flex-1 text-sm text-text">
            {t("settings.notifications.pushOnly")}
          </Text>
        </View>
      </Section>

      {/* Weekly digest */}
      <Section title={t("settings.notifications.weeklyDigest")}>
        <ToggleRow
          label={t("settings.notifications.weeklyDigestToggle")}
          value={settings.digestEnabled}
          onValueChange={(v) => void onSave({ digestEnabled: v })}
          disabled={saving}
          accent={c.accent}
          track={c.border}
        />
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <Field label={t("settings.notifications.day")}>
              <Select
                title={t("settings.notifications.day")}
                value={String(settings.digestDayOfWeek)}
                disabled={saving || !settings.digestEnabled}
                options={DAY_KEYS.map((k, i) => ({
                  value: String(i),
                  label: t(`analytics.weekday.labels.${k}`),
                }))}
                onChange={(v) => void onSave({ digestDayOfWeek: Number(v) })}
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label={t("settings.notifications.hour")}>
              <Select
                title={t("settings.notifications.hour")}
                value={String(settings.digestHour)}
                disabled={saving || !settings.digestEnabled}
                options={hourOptions()}
                onChange={(v) => void onSave({ digestHour: Number(v) })}
              />
            </Field>
          </View>
        </View>
        <View className="mt-3">
          <Field label={t("settings.notifications.timezone")}>
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
              <Text className="font-sans text-base flex-1 text-text" numberOfLines={1}>
                {settings.timezone || "—"}
              </Text>
              {deviceTz && deviceTz !== settings.timezone && (
                <Pressable
                  onPress={() => void onSave({ timezone: deviceTz })}
                  accessibilityRole="button"
                  className="flex-row items-center gap-1"
                  hitSlop={8}
                >
                  <MapPin size={13} color={c.accent} />
                  <Text className="text-xs font-sans-medium text-accent">
                    {t("settings.notifications.useDeviceTimezone")}
                  </Text>
                </Pressable>
              )}
            </View>
          </Field>
        </View>
      </Section>

      {/* Daily digest */}
      <Section title={t("settings.notifications.dailyDigest")}>
        <ToggleRow
          label={t("settings.notifications.dailyDigestToggle")}
          value={settings.dailyDigestEnabled}
          onValueChange={(v) => void onSave({ dailyDigestEnabled: v })}
          disabled={saving}
          accent={c.accent}
          track={c.border}
        />
        <View className="mt-3 w-36">
          <Field label={t("settings.notifications.hour")}>
            <Select
              title={t("settings.notifications.hour")}
              value={String(settings.dailyDigestHour)}
              disabled={saving || !settings.dailyDigestEnabled}
              options={hourOptions()}
              onChange={(v) => void onSave({ dailyDigestHour: Number(v) })}
            />
          </Field>
        </View>
        <Text className="font-sans mt-3 text-xs text-text-muted">
          {t("settings.notifications.dailyDigestHint")}
        </Text>
      </Section>

      {/* Other notifications */}
      <Section title={t("settings.notifications.otherNotifications")}>
        <ToggleRow
          label={t("settings.notifications.sleepingAlertsToggle")}
          value={settings.sleepingAlertsEnabled}
          onValueChange={(v) => void onSave({ sleepingAlertsEnabled: v })}
          disabled={saving}
          accent={c.accent}
          track={c.border}
        />
        <View className="h-px bg-border" />
        <ToggleRow
          label={t("settings.notifications.dueRemindersToggle")}
          value={settings.dueRemindersEnabled}
          onValueChange={(v) => void onSave({ dueRemindersEnabled: v })}
          disabled={saving}
          accent={c.accent}
          track={c.border}
        />
        <View className="mt-3 w-36">
          <Field label={t("settings.notifications.dueReminderHour")}>
            <Select
              title={t("settings.notifications.dueReminderHour")}
              value={String(settings.dueReminderHour)}
              disabled={saving || !settings.dueRemindersEnabled}
              options={hourOptions()}
              onChange={(v) => void onSave({ dueReminderHour: Number(v) })}
            />
          </Field>
        </View>
        <Text className="font-sans mt-3 text-xs text-text-muted">
          {t("settings.notifications.dueRemindersHint")}
        </Text>
        <View className="mt-3 h-px bg-border" />
        <ToggleRow
          label={t("settings.notifications.manualToggle")}
          value={settings.manualEnabled}
          onValueChange={(v) => void onSave({ manualEnabled: v })}
          disabled={saving}
          accent={c.accent}
          track={c.border}
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-5">
      <Meta variant="cintillo" tone="muted">
        {title}
      </Meta>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  disabled,
  accent,
  track,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accent: string;
  track: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="font-sans flex-1 pr-3 text-sm text-text">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: track, true: alpha(accent, 0.6) }}
        thumbColor={value ? accent : undefined}
      />
    </View>
  );
}
