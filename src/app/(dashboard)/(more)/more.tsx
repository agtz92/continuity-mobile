import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  Bug,
  CreditCard,
  ChevronRight,
  FileText,
  Lightbulb,
  LogOut,
  NotebookPen,
  Palette,
  Plug,
  ScrollText,
  ShieldCheck,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

type Item = { key: string; label: string; icon: LucideIcon; href: Href };

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const workspace: Item[] = [
    {
      key: "assistant",
      label: t("assistant.buttonLabel"),
      icon: Sparkles,
      href: "/assistant",
    },
    { key: "ideas", label: t("tabs.ideas"), icon: Lightbulb, href: "/ideas" },
    {
      key: "quick-notes",
      label: t("tabs.notes"),
      icon: NotebookPen,
      href: "/quick-notes",
    },
    { key: "log", label: t("tabs.log"), icon: ScrollText, href: "/log" },
    {
      key: "analytics",
      label: t("tabs.analytics"),
      icon: BarChart3,
      href: "/analytics",
    },
  ];

  const settings: Item[] = [
    { key: "profile", label: t("settings.nav.profile"), icon: User, href: "/profile" },
    {
      key: "notifications",
      label: t("settings.nav.notifications"),
      icon: Bell,
      href: "/notifications",
    },
    {
      key: "appearance",
      label: t("settings.nav.appearance"),
      icon: Palette,
      href: "/appearance",
    },
    {
      key: "plugins",
      label: t("settings.nav.plugins"),
      icon: Plug,
      href: "/plugins",
    },
    {
      key: "billing",
      label: t("settings.nav.billing"),
      icon: CreditCard,
      href: "/billing",
    },
  ];

  const renderGroup = (items: Item[]) => (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <Pressable
            key={it.key}
            onPress={() => router.push(it.href)}
            className={
              "flex-row items-center gap-3 px-4 py-4 " +
              (i > 0 ? "border-t border-border" : "")
            }
          >
            <Icon color={s.text} size={20} />
            <Text className="text-base flex-1 text-text">{it.label}</Text>
            <ChevronRight color={s.textMuted} size={18} />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-5">
        <Text className="text-2xl font-bold text-text">{t("tabs.more")}</Text>

        {renderGroup(workspace)}

        <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          {t("settings.nav.label")}
        </Text>
        {renderGroup(settings)}

        {renderGroup([
          {
            key: "reportBug",
            label: t("reportBug.title"),
            icon: Bug,
            href: "/report-bug",
          },
        ])}

        {/* Legal — external web pages (Apple wants an accessible privacy policy) */}
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {[
            {
              key: "privacy",
              label: t("settings.legal.privacy"),
              icon: ShieldCheck,
              url: "https://continuu.it/privacy",
            },
            {
              key: "terms",
              label: t("settings.legal.terms"),
              icon: FileText,
              url: "https://continuu.it/terms",
            },
          ].map((it, i) => {
            const Icon = it.icon;
            return (
              <Pressable
                key={it.key}
                onPress={() => void Linking.openURL(it.url)}
                className={
                  "flex-row items-center gap-3 px-4 py-4 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <Icon color={s.text} size={20} />
                <Text className="text-base flex-1 text-text">{it.label}</Text>
                <ChevronRight color={s.textMuted} size={18} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-4"
        >
          <LogOut color={s.text} size={18} />
          <Text className="text-base font-semibold text-text">
            {t("accountMenu.items.signOut")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
