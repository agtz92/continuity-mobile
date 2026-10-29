import { useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Meta } from "@/components/ui/Meta";
import {
  discardFailed,
  failedOps,
  retryFailed,
  subscribePending,
  type FailedOp,
} from "@/lib/outbox";
import { confirmAsync } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * "No se pudo guardar": lo que se hizo sin red y el servidor rechazó al
 * reconectar (tope del plan, algo que ya no existía…). La cola no lo tira
 * (`lib/outbox/queue.ts`): aquí se ve qué era y por qué no entró, y se puede
 * reintentar, copiar el texto o descartarlo. Se llega desde el banner.
 */
export default function Unsaved() {
  const { t } = useTranslation();
  const items = useSyncExternalStore(subscribePending, failedOps);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      {items.length === 0 ? (
        <EmptyState title={t("offline.failed.emptyTitle")} body={t("offline.failed.emptyBody")} />
      ) : (
        <>
          <Text className="font-sans text-sm text-text-muted">{t("offline.failed.intro")}</Text>
          {items.map((item) => (
            <FailedCard key={item.opId} item={item} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function FailedCard({ item }: { item: FailedOp }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [busy, setBusy] = useState(false);
  const { kindKey, text } = describe(item);

  const retry = async () => {
    setBusy(true);
    const ok = await retryFailed(item.opId);
    setBusy(false);
    if (ok) toast.success(t("offline.failed.retried"));
  };

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    toast.success(t("offline.failed.copied"));
  };

  const discard = async () => {
    const ok = await confirmAsync(
      t("offline.failed.discardConfirm"),
      t("offline.failed.discardConfirmBody"),
      t("offline.failed.discard"),
      t("common.cancel")
    );
    if (ok) discardFailed(item.opId);
  };

  return (
    <View
      className="gap-3 rounded-lg border bg-surface p-4"
      style={{ borderColor: alpha(c.signal, 0.35) }}
    >
      <Meta>{t(`offline.failed.kinds.${kindKey}`)}</Meta>
      <Text className="font-sans-medium text-base text-text" numberOfLines={6}>
        {text || t("offline.failed.noText")}
      </Text>
      <Text className="font-sans text-sm" style={{ color: c.signal }}>
        {item.error}
      </Text>
      <View className="flex-row gap-2">
        <Action label={t("offline.failed.retry")} onPress={retry} disabled={busy} primary />
        <Action label={t("offline.failed.copy")} onPress={copy} disabled={busy || !text} />
        <Action label={t("offline.failed.discard")} onPress={discard} disabled={busy} />
      </View>
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className="rounded-md border px-3 py-2"
      style={{
        borderColor: primary ? c.accent : c.border,
        backgroundColor: primary ? c.accent : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        className="font-sans-medium text-sm"
        style={{ color: primary ? c.bg : c.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Qué era y el texto que el usuario escribió (lo que se copia). */
function describe(item: FailedOp): { kindKey: string; text: string } {
  const v = item.variables as Record<string, any>;
  const d = (v.data ?? {}) as Record<string, any>;
  const join = (...parts: Array<string | undefined>) =>
    parts.map((p) => (p ?? "").trim()).filter(Boolean).join("\n\n");
  switch (item.kind) {
    case "task.create":
    case "task.update":
      return { kindKey: "task", text: join(d.title) };
    case "idea.create":
      return { kindKey: "idea", text: join(d.title, d.description, d.why) };
    case "projectNote.add":
      return { kindKey: "projectNote", text: join(v.note) };
    case "routine.create":
    case "routine.update":
      return { kindKey: "routine", text: join(d.title, d.description) };
    case "quickNote.create":
    case "quickNote.update":
      return { kindKey: "quickNote", text: join(d.title) };
    case "section.add":
    case "section.update":
      return { kindKey: "section", text: join(d.heading, d.body) };
    default:
      return { kindKey: "other", text: "" };
  }
}
