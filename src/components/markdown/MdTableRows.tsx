import { Text, View } from "react-native";

import { emptyColumns, type TableBlock } from "./parse";
import { Meta } from "@/components/ui/Meta";
import { Figure } from "@/components/ui/Figure";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * La misma tabla, como **filas de la app**. Es el plan B, no el A.
 *
 * Pasado cierto número de columnas visibles, una tabla real no cabe en un
 * teléfono sin romper algo: o hay scroll horizontal (prohibido) o las celdas
 * envuelven a tres líneas. Aquí cada fila del markdown pasa a ser una fila del
 * producto — sujeto a la izquierda, la cifra a la derecha en display, y el
 * resto como metadatos debajo.
 *
 * Lo que se pierde es comparar columna a columna, y ocupa el doble de alto. Por
 * eso lo elige **el renderizador contando columnas**, no el usuario: no es una
 * preferencia, es lo que cabe.
 */
export function MdTableRows({ table }: { table: TableBlock }) {
  const c = useThemeColors();
  const hidden = emptyColumns(table);
  const cols = table.header.map((_, i) => i).filter((i) => !hidden.has(i));
  if (cols.length === 0) return null;

  const titleCol = cols[0];
  // La cifra grande es la última columna alineada a la derecha; si el modelo no
  // alineó nada, la última visible.
  const numericCol =
    [...cols].reverse().find((i) => table.align[i] === "right") ??
    cols[cols.length - 1];
  const metaCols = cols.filter((i) => i !== titleCol && i !== numericCol);

  return (
    <View
      className="my-3"
      style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line[8] }}
    >
      {table.rows.map((row, r) => (
        <View
          key={r}
          className="flex-row items-baseline gap-3 py-2.5"
          style={
            r > 0 ? { borderTopWidth: 1, borderColor: c.line[8] } : undefined
          }
        >
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="font-sans-semibold text-[13px]"
              style={{ color: c.text }}
            >
              {row[titleCol]}
            </Text>
            {metaCols.length > 0 && (
              <View className="mt-0.5 flex-row flex-wrap gap-x-2">
                {metaCols.map((i) => (
                  <Meta key={i} tone="faint">
                    {`${table.header[i]}: ${row[i] ?? ""}`}
                  </Meta>
                ))}
              </View>
            )}
          </View>
          {numericCol !== titleCol && (
            <Figure size={17}>{row[numericCol]}</Figure>
          )}
        </View>
      ))}
    </View>
  );
}
