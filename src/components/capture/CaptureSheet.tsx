import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client/react";
import type { ApolloCache } from "@apollo/client";

import type { Project } from "@/lib/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useThemeColors, alpha } from "@/theme/useThemeColors";
import { toast } from "@/lib/toast";
import { selectionFeedback } from "@/lib/feedback";
import {
  CAPTURE_KINDS,
  projectSuggestions,
  projectToken,
  quickParse,
  type CaptureKind,
} from "@/lib/quickParse";
import { CREATE_TASK, DASHBOARD_QUERY, CREATE_IDEA, ADD_NOTE } from "@/lib/graphql";
import { insertIntoDashboard, type DashboardList } from "@/lib/captureCache";
import { useQuickNoteMutations } from "@/hooks/useQuickNoteMutations";
import { useDashboardData } from "@/hooks/useDashboardData";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

/**
 * Escribe lo creado en la caché del dashboard **ya**, y además refetchea para
 * reconciliar lo que deriva el servidor. Sin esto, lo capturado tardaba en
 * aparecer lo que tarda `DASHBOARD_QUERY` entera, que trae toda la cuenta.
 */
function captureMutationOptions(list: DashboardList, field: string) {
  return {
    ...refetchAfter,
    // Apollo 4: `ApolloCache` ya no es genérico y `update` recibe el
    // `FetchResult` crudo, así que el tipado del payload se hace aquí.
    update(cache: ApolloCache, result: { data?: unknown }) {
      const payload = (result.data ?? null) as Record<string, unknown> | null;
      const created = payload?.[field] as { id: string } | undefined;
      cache.updateQuery({ query: DASHBOARD_QUERY }, (previous: unknown) =>
        insertIntoDashboard(
          previous as { dashboard?: Record<string, unknown> } | null,
          list,
          created
        )
      );
    },
  };
}

/** Fecha local a ISO: medianoche **local**, no UTC (si no, la tarea cae un día antes). */
function localDateToIso(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0).toISOString();
}

/**
 * Captura rápida, versión móvil.
 *
 * Misma línea y mismos tokens que en la web —`#proyecto`, `@fecha hora`,
 * `~duración`, `!bloqueo`, `/tipo`— resueltos por el **mismo parser**
 * (`lib/quickParse.ts`, espejo del de la web). Escribir la misma frase en el
 * teléfono y en el escritorio tiene que crear exactamente lo mismo; si aquí se
 * interpretara distinto, la sintaxis dejaría de ser fiable en los dos sitios.
 *
 * Lo que cambia es la superficie, no las reglas: hoja inferior en vez de
 * overlay, teclado del sistema en vez de atajos, y las sugerencias de proyecto
 * como chips que se tocan en vez de una lista con flechas.
 *
 * Bajo el campo se enseña **lo que se va a guardar** —proyecto, día, duración,
 * bloqueo— y también lo que no se entendió, en vez de dejar que el usuario lo
 * descubra al abrir la tarea.
 */
export function CaptureSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { projects } = useDashboardData();

  const [kind, setKind] = useState<CaptureKind>("task");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const [createTask] = useMutation(
    CREATE_TASK,
    captureMutationOptions("tasks", "createTask")
  );
  const [createIdea] = useMutation(
    CREATE_IDEA,
    captureMutationOptions("ideas", "createIdea")
  );
  const [addNote] = useMutation(
    ADD_NOTE,
    captureMutationOptions("activities", "addNote")
  );
  const { createNote } = useQuickNoteMutations();

  const parsed = useMemo(() => quickParse(text, projects), [text, projects]);
  const effectiveKind = parsed.kind ?? kind;
  const canBlock = effectiveKind === "task";
  const needsProject = effectiveKind === "update";
  const ready =
    parsed.title.length > 0 && (!needsProject || parsed.projectId !== null);

  // Sugerencias del `#` que se está escribiendo: aquí no hay flechas ni ↵, así
  // que el token se completa tocando el nombre.
  const suggestions = useMemo(() => {
    const match = text.match(/(^|\s)#(\S*)$/);
    if (!match) return [];
    return projectSuggestions(match[2], projects, 4);
  }, [text, projects]);

  const acceptSuggestion = (project: Project) => {
    selectionFeedback();
    setText((current) =>
      current.replace(/(^|\s)#(\S*)$/, `$1${projectToken(project.name)} `)
    );
  };

  const close = () => {
    setText("");
    onClose();
  };

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (effectiveKind === "task") {
        const date =
          parsed.dueDate ??
          (parsed.dueTime ? new Date().toISOString().slice(0, 10) : null);
        const timed = Boolean(date && parsed.dueTime);
        await createTask({
          variables: {
            data: {
              title: parsed.title,
              projectId: parsed.projectId,
              dueDate: date ? localDateToIso(date) : null,
              done: false,
              effortHours: null,
              dueTime: timed ? parsed.dueTime : null,
              durationMinutes: timed ? parsed.durationMinutes : null,
              // Tarea y bloqueo en la misma transacción del servidor: antes
              // eran dos mutations y podían quedar a medias.
              blocker: parsed.blocked ? parsed.blockerReason : "",
            },
          },
        });
      } else if (effectiveKind === "idea") {
        await createIdea({
          variables: { data: { title: parsed.title, description: "", why: "" } },
        });
      } else if (effectiveKind === "note") {
        const note = await createNote({
          title: parsed.title,
          projectId: parsed.projectId,
        });
        if (!note) throw new Error("createQuickNote failed");
      } else {
        await addNote({
          variables: { projectId: parsed.projectId, note: parsed.title },
        });
      }
      toast.success(t(`capture.saved.${effectiveKind}`));
      close();
    } catch {
      // El texto se queda en el campo: es lo único que el usuario no puede
      // recuperar si lo tiramos.
      toast.error(t("capture.failed"));
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = (() => {
    if (!parsed.dueDate && !parsed.dueTime) return "";
    const day = parsed.dueDate
      ? new Date(`${parsed.dueDate}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : t("capture.today");
    return parsed.dueTime ? `${day} · ${parsed.dueTime}` : day;
  })();

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t("capture.title")}
      footer={
        <Pressable
          onPress={() => void save()}
          disabled={!ready || busy}
          className="rounded-lg bg-accent px-4 py-2.5"
          style={{ opacity: !ready || busy ? 0.5 : 1 }}
        >
          <Text className="text-center text-sm font-sans-medium text-bg">
            {t("capture.save")}
          </Text>
        </Pressable>
      }
    >
      <View className="gap-3">
        <View className="flex-row flex-wrap gap-1.5">
          {CAPTURE_KINDS.map((k) => {
            const active = effectiveKind === k;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  selectionFeedback();
                  setKind(k);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className="rounded-md px-2.5 py-1"
                style={{
                  borderWidth: 1,
                  borderColor: active ? c.accent : c.line[14],
                  backgroundColor: active ? alpha(c.accent, 0.12) : "transparent",
                }}
              >
                <Text
                  className="font-sans text-[11px] uppercase tracking-wider"
                  style={{ color: active ? c.accent : c.text4 }}
                >
                  {t(`capture.kind.${k}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void save()}
          autoFocus
          multiline
          placeholder={t(`capture.placeholder.${effectiveKind}`)}
          placeholderTextColor={c.textOff}
          accessibilityLabel={t(`capture.kind.${effectiveKind}`)}
          className="rounded-lg px-3 py-2.5 text-base text-text"
          style={{
            borderWidth: 1,
            borderColor: c.line[14],
            backgroundColor: c.well,
            minHeight: 64,
          }}
        />

        {suggestions.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {suggestions.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => acceptSuggestion(project)}
                className="rounded-md px-2.5 py-1"
                style={{ borderWidth: 1, borderColor: c.line[22] }}
              >
                <Text className="font-sans text-xs text-text-2">{project.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Lo que se va a guardar, resuelto en vivo. */}
        <View className="flex-row flex-wrap items-center gap-1.5">
          {parsed.project && (
            <View
              className="rounded-md px-2 py-0.5"
              style={{
                borderWidth: 1,
                borderColor: alpha(c.accent, 0.35),
                backgroundColor: alpha(c.accent, 0.12),
              }}
            >
              <Text
                className="font-sans text-[11px] uppercase tracking-wider"
                style={{ color: c.accent }}
              >
                {`# ${parsed.project.name}`}
              </Text>
            </View>
          )}
          {dateLabel !== "" && (
            <View
              className="rounded-md px-2 py-0.5"
              style={{ borderWidth: 1, borderColor: c.line[22] }}
            >
              <Text className="font-sans text-[11px] text-text-2">{dateLabel}</Text>
            </View>
          )}
          {parsed.durationMinutes !== null && (
            <View
              className="rounded-md px-2 py-0.5"
              style={{ borderWidth: 1, borderColor: c.line[22] }}
            >
              <Text className="font-sans text-[11px] text-text-2">
                {t("capture.duration", { minutes: parsed.durationMinutes })}
              </Text>
            </View>
          )}
          {canBlock && parsed.blocked && (
            <View
              className="rounded-md px-2 py-0.5"
              style={{ borderWidth: 1, borderColor: alpha(c.signal, 0.5) }}
            >
              <Text className="font-sans text-[11px]" style={{ color: c.signal }}>
                {parsed.blockerReason || t("capture.blockedNoReason")}
              </Text>
            </View>
          )}
        </View>

        {needsProject && parsed.projectId === null && (
          <Text className="font-sans text-xs text-text-muted">
            {t("capture.updateNeedsProject")}
          </Text>
        )}
        {parsed.projectCandidates.length > 0 && (
          <Text className="font-sans text-xs text-text-muted">
            {t("capture.ambiguous", {
              names: parsed.projectCandidates
                .slice(0, 3)
                .map((p) => p.name)
                .join(" · "),
            })}
          </Text>
        )}
        {parsed.unresolved.length > 0 && (
          <Text className="font-sans text-xs text-text-muted">
            {t("capture.unresolved", { tokens: parsed.unresolved.join(" ") })}
          </Text>
        )}
        <Text className="font-sans text-xs text-text-muted">{t("capture.syntax")}</Text>
      </View>
    </BottomSheet>
  );
}
