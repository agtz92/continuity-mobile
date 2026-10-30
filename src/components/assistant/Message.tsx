import { memo } from "react";
import { Text, View } from "react-native";
import { Markdown } from "@/components/markdown/Markdown";
import { useTranslation } from "react-i18next";
import { InfinityIcon } from "lucide-react-native";
import type { ChatMessage } from "@/hooks/useAssistant";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { ToolCallCard } from "./ToolCallCard";

/** "2:36" en el idioma del usuario. */
function clock(ms: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(ms);
  } catch {
    const d = new Date(ms);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

export const Message = memo(function Message({
  message,
  /** Solo el ÚLTIMO mensaje puede estar a medias: el parser deja el bloque
   *  final en "incompleto" mientras llegan filas, y aplicarlo a un mensaje ya
   *  cerrado escondería su última tabla. */
  streaming = false,
  pendingLabel = null,
}: {
  message: ChatMessage;
  streaming?: boolean;
  /** "Escribiendo …" mientras llega el input de una tool, en vez de "Pensando…". */
  pendingLabel?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();

  if (message.role === "user") {
    return (
      <View className="items-end">
        <View
          className="max-w-[85%]"
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottomRightRadius: 4,
            borderBottomLeftRadius: 12,
            backgroundColor: alpha(c.accent, 0.12),
          }}
        >
          <Text className="font-sans" style={{ fontSize: 16, lineHeight: 23, color: c.text }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }

  // assistant: cintillo "Loop · 2:36" (la hora solo en mensajes de esta sesión).
  const isEmpty = message.blocks.length === 0;
  const byline = message.createdAt
    ? `${t("assistant.title")} · ${clock(message.createdAt, i18n.language)}`
    : t("assistant.title");
  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <InfinityIcon size={12} color={c.text3} />
        <Meta variant="cintillo" tone="muted">
          {byline}
        </Meta>
      </View>
      {isEmpty ? (
        <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
          {pendingLabel ?? t("assistant.message.thinking")}
        </Text>
      ) : (
        message.blocks.map((block, i) => {
          if (block.type === "text") {
            // El modelo escribe markdown y hasta ahora nadie lo leía: los
            // `**`, los `---` y las tuberías de las tablas salían crudos.
            // Mismo renderizador que las notas, en variante de lectura.
            return (
              <Markdown
                key={i}
                text={block.text}
                variant="chat"
                streaming={streaming}
              />
            );
          }
          return <ToolCallCard key={block.id} block={block} />;
        })
      )}
    </View>
  );
});
