import React from "react";
import { Text, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import type { ThemeColors } from "@/theme/useThemeColors";

/**
 * El nivel de línea: negrita, cursiva, código y enlaces. **Espejo de
 * `frontend/src/components/markdown/inline.tsx`**, con la misma gramática.
 *
 * La diferencia con web es solo de medio: aquí no hay `<strong>` ni `<em>` ni
 * `<a>`, así que todo sale como `<Text>` anidados. RN los compone en la misma
 * línea, que es exactamente lo que hacen los `span` del navegador.
 *
 * Y **cada peso es una familia distinta** en Schibsted, así que la negrita se
 * pide por `fontFamily`, no por `fontWeight`: un `fontWeight:"700"` sobre el
 * peso 400 daría negrita sintética (regla del rediseño, AGENTS.md).
 */

const INLINE =
  /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

/** Esquemas internos: `[Nombre](task:uuid)` no es un enlace, es un objeto. */
const ENTITY = /^(task|project|note):(.+)$/;

export interface InlineOptions {
  /**
   * Convierte `[Nombre](task:uuid)` en algo tocable. Sin resolutor, esos
   * enlaces se degradan a texto plano — nunca a un destino roto.
   */
  renderEntity?: (
    type: "task" | "project" | "note",
    id: string,
    label: string,
    key: string
  ) => React.ReactNode;
}

export function renderInline(
  keyPrefix: string,
  text: string,
  c: ThemeColors,
  { renderEntity }: InlineOptions = {}
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;

    if (m[2] !== undefined) {
      nodes.push(
        <Text key={key} className="font-sans-semibold" style={{ color: c.text }}>
          {m[2]}
        </Text>
      );
    } else if (m[4] !== undefined || m[6] !== undefined) {
      nodes.push(
        <Text key={key} style={{ fontStyle: "italic" }}>
          {m[4] ?? m[6]}
        </Text>
      );
    } else if (m[8] !== undefined) {
      // El rediseño retiró la familia mono; el código inline se dice con fondo
      // y tinta, no con otra fuente que ya no se carga.
      nodes.push(
        <Text
          key={key}
          style={{
            backgroundColor: c.line[8],
            color: c.text2,
            fontSize: 13,
          }}
        >
          {` ${m[8]} `}
        </Text>
      );
    } else if (m[10] !== undefined) {
      const label = m[10];
      const href = m[11];
      const entity = ENTITY.exec(href);
      if (entity) {
        const type = entity[1] as "task" | "project" | "note";
        const rendered = renderEntity?.(type, entity[2], label, key);
        nodes.push(rendered ?? <Text key={key}>{label}</Text>);
      } else {
        nodes.push(
          <Text
            key={key}
            style={{ color: c.accent, textDecorationLine: "underline" }}
            onPress={() => {
              // Dentro de la app cuando se puede; `Linking` es el respaldo.
              WebBrowser.openBrowserAsync(href).catch(() => {
                void Linking.openURL(href).catch(() => {});
              });
            }}
          >
            {label}
          </Text>
        );
      }
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
