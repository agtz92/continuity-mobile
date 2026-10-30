import { memo, useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Lightbulb,
  NotebookPen,
  ScrollText,
  InfinityIcon,
  type LucideIcon,
} from "lucide-react-native";

import { Meta } from "@/components/ui/Meta";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { TourAnchor } from "@/components/onboarding/tour/TourAnchor";
import { useTourScroller } from "@/components/onboarding/tour/anchors";
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { Tombstone } from "@/components/icons/Tombstone";
import { formatHours, summarizeDays } from "@/components/calendar/summary";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { getUsage, type UsageSnapshot } from "@/lib/assistantApi";
import { useAuth } from "@/lib/auth";
import { weekDays } from "@/lib/calendar";
import { toLocalISO, todayLocalISODate } from "@/lib/date";
import { NOTIFICATION_SETTINGS_QUERY, PROFILE_QUERY } from "@/lib/graphql";
import { signOut } from "@/lib/signOut";
import { PALETTE_LABEL_KEY } from "@/palette/config";
import { THEME_LABEL_KEY } from "@/theme/config";
import { useTheme } from "@/theme/ThemeProvider";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

type NotifFlags = {
  digestEnabled: boolean;
  dailyDigestEnabled: boolean;
  sleepingAlertsEnabled: boolean;
  dueRemindersEnabled: boolean;
  manualEnabled: boolean;
};

/** Fila de la lista principal: 56 px, icono 20, conteo a la derecha. */
const WorkspaceRow = memo(function WorkspaceRow({
  icon: Icon,
  label,
  value,
  href,
  onOpen,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  href: Href;
  onOpen: (href: Href) => void;
  last?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => onOpen(href)}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="flex-row items-center active:opacity-70"
      style={{
        minHeight: SIZE.row,
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line[14],
      }}
    >
      <Icon size={20} color={c.text2} />
      <Text className="font-sans flex-1" style={{ fontSize: 17, color: c.text }}>
        {label}
      </Text>
      {value ? (
        <Text
          className="font-sans-medium"
          style={{ fontSize: 14, color: c.text3, fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
      ) : null}
      <ChevronRight size={18} color={c.text5} />
    </Pressable>
  );
});

/** Fila de ajustes: 52 px, sin icono, valor a la derecha (elipsa). */
const SettingRow = memo(function SettingRow({
  label,
  value,
  href,
  onOpen,
}: {
  label: string;
  value?: string | null;
  href: Href;
  onOpen: (href: Href) => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => onOpen(href)}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="flex-row items-center active:opacity-70"
      style={{ minHeight: 52, gap: 12, borderBottomWidth: 1, borderBottomColor: c.line[14] }}
    >
      <Text className="font-sans" style={{ fontSize: 16, color: c.text }}>
        {label}
      </Text>
      <View className="min-w-0 flex-1 items-end">
        {value ? (
          <Text numberOfLines={1} className="font-sans" style={{ fontSize: 14, color: c.text3 }}>
            {value}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={c.text5} />
    </Pressable>
  );
});

/** Pie: enlaces de texto de 44 px (legal, salir). */
function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="justify-center active:opacity-60"
      style={{ minHeight: SIZE.hit }}
    >
      <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text3 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function More() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { theme, palette } = useTheme();
  const { session } = useAuth();
  const { avatarUrl } = useUserAvatar();
  const { data: profileData } = useQuery<{ profile: { firstName?: string | null } }>(
    PROFILE_QUERY,
    { fetchPolicy: "cache-first" },
  );
  // ThemeProvider ya tiene esta query en caché: leerla aquí no cuesta red.
  const { data: notifData } = useQuery<{ notificationSettings: NotifFlags }>(
    NOTIFICATION_SETTINGS_QUERY,
    { fetchPolicy: "cache-first" },
  );
  const { projects, tasks, ideas, activities, routines, routineOccurrences } =
    useDashboardData();
  const { quickNotes } = useQuickNotes();

  // `/usage/` trae plan, cupo de mensajes y periodo de facturación de una vez.
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUsage()
        .then((u) => {
          if (active) setUsage(u);
        })
        .catch(() => {
          /* backend del asistente caído: se omiten plan y cupo */
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const open = useCallback((href: Href) => router.push(href), [router]);
  const scroller = useTourScroller();

  const todayISO = todayLocalISODate();
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const calendarMeta = useMemo(() => {
    const week = weekDays(new Date(todayISO + "T00:00:00"));
    const w = summarizeDays(tasks, projectsById, routines, routineOccurrences, week);
    const d = summarizeDays(tasks, projectsById, routines, routineOccurrences, [todayISO]);
    return t("views.more.calendarMeta", {
      today: d.tasks + d.routines,
      hours: formatHours(w.hours),
    });
  }, [tasks, projectsById, routines, routineOccurrences, todayISO, t]);

  const logToday = useMemo(
    () => activities.filter((a) => a.created && toLocalISO(new Date(a.created)) === todayISO).length,
    [activities, todayISO],
  );
  const killed = useMemo(() => projects.filter((p) => p.status === "killed").length, [projects]);

  const plan = usage?.plan ?? null;
  const planLabel = plan ? t(`settings.billing.${plan}`) : null;
  const messagesLeft =
    usage && usage.daily_message_cap != null
      ? Math.max(0, usage.daily_message_cap - usage.messages_sent_today)
      : null;
  const billingValue = planLabel
    ? usage?.subscription_period
      ? `${planLabel} · ${t(`plans.period.${usage.subscription_period}`)}`
      : planLabel
    : null;
  const n = notifData?.notificationSettings;
  const notifValue = n
    ? t(
        n.digestEnabled ||
          n.dailyDigestEnabled ||
          n.sleepingAlertsEnabled ||
          n.dueRemindersEnabled ||
          n.manualEnabled
          ? "views.more.on"
          : "views.more.off",
      )
    : null;
  const appearanceValue = `${t(`settings.appearance.${THEME_LABEL_KEY[theme]}`)} · ${t(
    `settings.appearance.${PALETTE_LABEL_KEY[palette]}`,
  )}`;

  const email = session?.user?.email ?? "";
  const name = profileData?.profile?.firstName?.trim() || email.split("@")[0] || "";
  const initial = (name || "?").charAt(0).toUpperCase();

  const identity = (
    <Pressable
      onPress={() => open("/profile")}
      accessibilityRole="button"
      accessibilityLabel={t("settings.nav.profile")}
      className="flex-row items-center active:opacity-70"
      style={{ gap: 10, minHeight: SIZE.hit }}
    >
      <View className="items-end">
        {name ? (
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.text }}>
            {name}
          </Text>
        ) : null}
        {planLabel ? (
          <Meta variant="cintillo" tone="muted">
            {planLabel}
          </Meta>
        ) : null}
      </View>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
      ) : (
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 48, height: 48, backgroundColor: c.text }}
        >
          <Text className="font-display" style={{ fontSize: 20, color: c.bg }}>
            {initial}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const workspace: {
    key: string;
    label: string;
    icon: LucideIcon;
    href: Href;
    value?: string | null;
  }[] = [
    { key: "ideas", label: t("tabs.ideas"), icon: Lightbulb, href: "/ideas", value: ideas.length ? String(ideas.length) : null },
    {
      key: "quick-notes",
      label: t("tabs.notes"),
      icon: NotebookPen,
      href: "/quick-notes",
      value: quickNotes.length ? String(quickNotes.length) : null,
    },
    {
      key: "log",
      label: t("tabs.log"),
      icon: ScrollText,
      href: "/log",
      value: logToday ? t("views.more.logToday", { count: logToday }) : null,
    },
    {
      key: "graveyard",
      label: t("views.graveyard.title"),
      // Tombstone es un SVG propio; se castea para el hueco de LucideIcon.
      icon: Tombstone as unknown as LucideIcon,
      href: "/graveyard",
      value: killed ? String(killed) : null,
    },
    { key: "analytics", label: t("tabs.analytics"), icon: BarChart3, href: "/analytics" },
  ];

  const settings: { key: string; label: string; href: Href; value?: string | null }[] = [
    { key: "profile", label: t("settings.nav.profile"), href: "/profile", value: email || null },
    { key: "notifications", label: t("settings.nav.notifications"), href: "/notifications", value: notifValue },
    { key: "appearance", label: t("settings.nav.appearance"), href: "/appearance", value: appearanceValue },
    { key: "plugins", label: t("settings.nav.plugins"), href: "/plugins" },
    { key: "billing", label: t("settings.nav.billing"), href: "/billing", value: billingValue },
    { key: "reportBug", label: t("reportBug.title"), href: "/report-bug" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        {...scroller}
        contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 12, paddingBottom: 40 }}
      >
        <NotificationStack />
        <ScreenHeadline primary={t("tabs.more")} right={identity} />

        {/* Dos tiles: Loop (accent sólido) y Calendar (surface). Las anclas del
            tour conservan sus claves `more.<key>`. */}
        <View className="flex-row" style={{ gap: 12, marginTop: 20 }}>
          <TourAnchor id="more.assistant" style={{ flex: 1 }}>
            <Pressable
              onPress={() => open("/assistant")}
              accessibilityRole="button"
              accessibilityLabel={t("assistant.buttonLabel")}
              className="rounded-xl active:opacity-80"
              style={{ height: 96, padding: 14, backgroundColor: c.accent, justifyContent: "space-between" }}
            >
              <InfinityIcon size={20} color={c.bg} />
              <View>
                <Text className="font-display" style={{ fontSize: 20, lineHeight: 24, color: c.bg }}>
                  {t("assistant.title")}
                </Text>
                {messagesLeft != null ? (
                  <Meta variant="cintillo" tone="inherit" style={{ color: c.bg }}>
                    {t("views.more.messagesLeft", { count: messagesLeft })}
                  </Meta>
                ) : null}
              </View>
            </Pressable>
          </TourAnchor>
          <TourAnchor id="more.calendar" style={{ flex: 1 }}>
            <Pressable
              onPress={() => open("/calendar")}
              accessibilityRole="button"
              accessibilityLabel={`${t("tabs.calendar")}, ${calendarMeta}`}
              className="rounded-xl active:opacity-80"
              style={{
                minHeight: 96,
                padding: 14,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line[14],
                justifyContent: "space-between",
              }}
            >
              <Calendar size={20} color={c.text2} />
              <View>
                <Text className="font-display" style={{ fontSize: 20, lineHeight: 24, color: c.text }}>
                  {t("tabs.calendar")}
                </Text>
                <Meta variant="cintillo" tone="muted">
                  {calendarMeta}
                </Meta>
              </View>
            </Pressable>
          </TourAnchor>
        </View>

        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: c.line[14] }}>
          {workspace.map((it, i) => (
            // Envolver por item hace que una sección nueva del menú nazca
            // señalable por el tour: su `key` ya es el ancla de `steps.ts`.
            <TourAnchor id={"more." + it.key} key={it.key}>
              <WorkspaceRow
                icon={it.icon}
                label={it.label}
                value={it.value}
                href={it.href}
                onOpen={open}
                last={i === workspace.length - 1}
              />
            </TourAnchor>
          ))}
        </View>

        <Meta variant="cintillo" tone="muted" style={{ marginTop: 28, marginBottom: 8 }}>
          {t("settings.nav.label")}
        </Meta>
        <View style={{ borderTopWidth: 1, borderTopColor: c.line[14] }}>
          {settings.map((it) => (
            <TourAnchor id={"more." + it.key} key={it.key}>
              <SettingRow label={it.label} value={it.value} href={it.href} onOpen={open} />
            </TourAnchor>
          ))}
        </View>

        {/* Legal. Apple (5.1.1) y Play exigen que la política de privacidad sea
            accesible; `WebBrowser` la abre dentro de la app con su botón de
            cerrar, en vez de expulsar a Safari. */}
        <View className="flex-row flex-wrap" style={{ marginTop: 20, columnGap: 20 }}>
          <FooterLink
            label={t("settings.legal.privacy")}
            onPress={() => void WebBrowser.openBrowserAsync("https://continuu.it/privacy")}
          />
          <FooterLink
            label={t("settings.legal.terms")}
            onPress={() => void WebBrowser.openBrowserAsync("https://continuu.it/terms")}
          />
          <FooterLink label={t("accountMenu.items.signOut")} onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
