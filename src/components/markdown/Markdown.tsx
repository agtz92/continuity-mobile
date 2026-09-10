import { useMemo } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { parseMarkdown, visibleColumnCount, type Block } from "./parse";
import { renderInline, type InlineOptions } from "./inline";
import { MdTable } from "./MdTable";
import { MdTableRows } from "./MdTableRows";
import { useThemeColors, type ThemeColors } from "@/theme/useThemeColors";

/**
 * El renderizador de markdown del producto: **uno** para las notas y para el
 * chat de Loop. Espejo de `frontend/src/components/markdown/Markdown.tsx`.
 *
 * Antes el mensaje del asistente se pintaba como un `<Text>` plano, así que los
 * `**`, los `---` y las tuberías de las tablas salían crudos: el modelo escribe
 * markdown y nadie lo estaba leyendo.
 *
 * `variant` no cambia lo que se parsea, solo cómo se viste: en una nota el
 * cuerpo es el de la app; en el chat es el cuerpo de lectura del rediseño, que
 * es lo que hace que una respuesta larga se lea en vez de escanearse.
 *
 * **El umbral de las tablas.** Lo decide el renderizador contando columnas
 * *visibles* — una que el modelo dejó entera vacía no cuenta, porque no se
 * pinta.
 */

/**
 * Tres, no cuatro como en web. **Divergencia deliberada:** el panel de web mide
 * 448px y un teléfono útil ronda los 350 descontando márgenes. A cuatro
 * columnas cada una se queda en ~85px, que solo aguanta cifras cortas; a la
 * quinta palabra envuelve a tres líneas y deja de ser una tabla.
 */
export const MAX_TABLE_COLUMNS = 3;

export type MarkdownVariant = "note" | "chat";

export function Markdown({
  text,
  variant = "note",
  streaming = false,
  renderEntity,
}: {
  text: string;
  variant?: MarkdownVariant;
  /** El stream sigue abierto: el último bloque puede estar a medias. */
  streaming?: boolean;
} & InlineOptions) {
  const c = useThemeColors();
  const blocks = useMemo(
    () => parseMarkdown(text, { streaming }),
    [text, streaming]
  );

  return (
    <View style={{ gap: variant === "chat" ? 8 : 6 }}>
      {blocks.map((b, i) => (
        <BlockView
          key={i}
          block={b}
          index={i}
          variant={variant}
          c={c}
          inline={{ renderEntity }}
        />
      ))}
    </View>
  );
}

function BlockView({
  block,
  index,
  variant,
  c,
  inline,
}: {
  block: Block;
  index: number;
  variant: MarkdownVariant;
  c: ThemeColors;
  inline: InlineOptions;
}) {
  const { t } = useTranslation();

  const bodyStyle =
    variant === "chat"
      ? { fontSize: 15, lineHeight: 24, color: c.text2 }
      : { fontSize: 14, lineHeight: 21, color: c.text };

  switch (block.kind) {
    case "heading": {
      // Deliberado desde el original de web: un titular con peso, no una
      // jerarquía nueva. Estos bloques viven DENTRO de una nota o un mensaje.
      const size = block.level === 1 ? 16 : 14;
      return (
        <Text
          className={block.level === 3 ? "font-sans-medium" : "font-sans-semibold"}
          style={{ fontSize: size, lineHeight: size + 6, color: c.text }}
        >
          {renderInline(`h-${index}`, block.text, c, inline)}
        </Text>
      );
    }

    case "list":
      // RN no tiene `<ul>`: la viñeta es una columna propia para que el texto
      // que envuelve quede alineado bajo sí mismo, no bajo la viñeta.
      return (
        <View style={{ gap: 2 }}>
          {block.items.map((it, idx) => (
            <View key={idx} className="flex-row" style={{ gap: 8 }}>
              <Text className="font-sans" style={[bodyStyle, { width: 18, textAlign: "right" }]}>
                {block.ordered ? `${idx + 1}.` : "·"}
              </Text>
              <Text className="font-sans" style={[bodyStyle, { flex: 1 }]}>
                {renderInline(`li-${index}-${idx}`, it, c, inline)}
              </Text>
            </View>
          ))}
        </View>
      );

    case "table":
      return visibleColumnCount(block) > MAX_TABLE_COLUMNS ? (
        <MdTableRows table={block} />
      ) : (
        <MdTable table={block} />
      );

    case "incomplete":
      // Mientras llegan filas, texto tenue. Una tabla que crece columna a
      // columna reflowea el mensaje tres veces por segundo.
      return (
        <Text
          className="font-sans text-xs"
          style={{ fontStyle: "italic", color: c.text4 }}
        >
          {t("assistant.markdown.writingTable")}
        </Text>
      );

    default:
      return (
        <Text className="font-sans" style={bodyStyle}>
          {renderInline(`p-${index}`, block.text, c, inline)}
        </Text>
      );
  }
}
