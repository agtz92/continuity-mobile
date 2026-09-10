import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react-native";

import { emptyColumns, type TableBlock } from "./parse";
import { renderInline } from "./inline";
import { Meta } from "@/components/ui/Meta";
import { Figure } from "@/components/ui/Figure";
import { useThemeColors } from "@/theme/useThemeColors";

/** Más de esto y la tabla deja de leerse de un vistazo. */
const VISIBLE_ROWS = 5;

/**
 * Tabla real, para pocas columnas. Espejo de la de web con dos reglas que aquí
 * pesan más porque la pantalla es de 390px, no de 448:
 *
 * - **Nunca scroll horizontal.** Si no cabe, es que tocaba el otro modo. Una
 *   columna escondida detrás de un gesto es una columna que nadie lee.
 * - **Una columna que no pinta nada ocupa 0.** El ancho se reparte entre las
 *   que dicen algo.
 */
export function MdTable({ table }: { table: TableBlock }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const hidden = emptyColumns(table);
  const cols = table.header.map((_, i) => i).filter((i) => !hidden.has(i));
  if (cols.length === 0) return null;

  const body = table.hasTotalRow ? table.rows.slice(0, -1) : table.rows;
  const total = table.hasTotalRow ? table.rows[table.rows.length - 1] : null;
  const shown = expanded ? body : body.slice(0, VISIBLE_ROWS);
  const rest = body.length - shown.length;

  const align = (i: number) =>
    table.align[i] === "right"
      ? ("right" as const)
      : table.align[i] === "center"
        ? ("center" as const)
        : ("left" as const);

  return (
    <View
      className="my-3"
      style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line[8] }}
    >
      <View
        className="flex-row"
        style={{ borderBottomWidth: 1, borderColor: c.line[14] }}
      >
        {cols.map((i) => (
          <View key={i} className="flex-1 py-1.5 pr-2">
            <Meta variant="cintillo" tone="faint" style={{ textAlign: align(i) }}>
              {table.header[i]}
            </Meta>
          </View>
        ))}
      </View>

      {shown.map((row, r) => (
        <View key={r} className="flex-row">
          {cols.map((i) => (
            <View key={i} className="flex-1 py-1.5 pr-2">
              <Text
                className={
                  // La primera columna visible es el sujeto de la fila.
                  i === cols[0] ? "font-sans-semibold text-[13px]" : "font-sans text-[13px]"
                }
                style={{
                  textAlign: align(i),
                  color: i === cols[0] ? c.text : c.text2,
                  fontVariant: align(i) === "right" ? ["tabular-nums"] : undefined,
                }}
              >
                {renderInline(`${r}-${i}`, row[i] ?? "", c)}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {total && (
        <View className="flex-row" style={{ backgroundColor: c.well }}>
          {cols.map((i) => (
            <View key={i} className="flex-1 py-2 pr-2">
              {i === cols[0] ? (
                <Meta variant="cintillo" tone="muted" style={{ textAlign: align(i) }}>
                  {total[i]}
                </Meta>
              ) : (
                <Figure size={17} style={{ textAlign: align(i) }}>
                  {total[i]}
                </Figure>
              )}
            </View>
          ))}
        </View>
      )}

      {rest > 0 && (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          className="flex-row items-center gap-1.5 py-2 active:opacity-70"
        >
          <ChevronDown size={12} color={c.text4} />
          <Meta variant="cintillo" tone="muted">
            {t("assistant.markdown.moreRows", { count: rest })}
          </Meta>
        </Pressable>
      )}
    </View>
  );
}
