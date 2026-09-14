import { Pressable, ScrollView, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Meta } from "@/components/ui/Meta";
import { TourAnchor } from "@/components/onboarding/tour/TourAnchor";
import { useTourScroller } from "@/components/onboarding/tour/anchors";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  Bug,
  Calendar,
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
import { Tombstone } from "@/components/icons/Tombstone";
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
    {
      key: "calendar",
      label: t("tabs.calendar"),
      icon: Calendar,
      href: "/calendar",
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
      key: "graveyard",
      label: t("views.graveyard.title"),
      // Tombstone is a plain SVG component; cast to satisfy the LucideIcon slot.
      icon: Tombstone as unknown as LucideIcon,
      href: "/graveyard",
    },
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

  // El tour necesita poder traer una fila a la vista si cae bajo el pliegue.
  const scroller = useTourScroller();

  const renderGroup = (items: Item[]) => (
    <View className="overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          // Envolver aquí y no en cada item hace que una sección nueva del
          // menú nazca señalable por el tour sin tocar nada: su `key` ya es
          // el ancla que `steps.ts` puede nombrar.
          <TourAnchor id={"more." + it.key} key={it.key}>
            <Pressable
              onPress={() => router.push(it.href)}
              className={
                "flex-row items-center gap-3 px-4 py-4 " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <Icon color={s.text} size={20} />
              <Text className="font-sans text-base flex-1 text-text">{it.label}</Text>
              <ChevronRight color={s.textMuted} size={18} />
            </Pressable>
          </TourAnchor>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView {...scroller} contentContainerClassName="gap-4 p-5">
        <ScreenTitle>{t("tabs.more")}</ScreenTitle>

        {renderGroup(workspace)}

        <Meta variant="cintillo" tone="muted" className="px-1 pt-2">
          {t("settings.nav.label")}
        </Meta>
        {renderGroup(settings)}

        {renderGroup([
          {
            key: "reportBug",
            label: t("reportBug.title"),
            icon: Bug,
            href: "/report-bug",
          },
        ])}

        {/* Legal. Apple (5.1.1) y Play exigen que la política de privacidad sea
            accesible; un enlace cumple, así que esto NO era una falta. Pero se
            abría con `Linking.openURL`, que te expulsa a Safari y te deja fuera
            de la app. `WebBrowser` la abre dentro, con su botón de cerrar. */}
        <View className="overflow-hidden rounded-xl border border-border bg-surface">
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
                onPress={() => void WebBrowser.openBrowserAsync(it.url)}
                className={
                  "flex-row items-center gap-3 px-4 py-4 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <Icon color={s.text} size={20} />
                <Text className="font-sans text-base flex-1 text-text">{it.label}</Text>
                <ChevronRight color={s.textMuted} size={18} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-4"
        >
          <LogOut color={s.text} size={18} />
          <Text className="text-base font-sans-semibold text-text">
            {t("accountMenu.items.signOut")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
