import React from "react";
import { Linking, Text, View } from "react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Tiny dependency-free Markdown renderer for Quick Note section bodies.
 * Supports a deliberate subset: headings, unordered and ordered lists, bold,
 * italic, inline code, and links. Anything else renders as plain text.
 * Read-only — editing happens in a TextInput elsewhere.
 */

const INLINE =
  /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

const MONO = { fontFamily: "Courier" as const };

function inlineNodes(
  text: string,
  keyPrefix: string,
  colors: { text: string; accent: string; surface: string }
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2] !== undefined)
      nodes.push(
        <Text key={key} style={{ fontWeight: "700" }}>
          {m[2]}
        </Text>
      );
    else if (m[4] !== undefined)
      nodes.push(
        <Text key={key} style={{ fontStyle: "italic" }}>
          {m[4]}
        </Text>
      );
    else if (m[6] !== undefined)
      nodes.push(
        <Text key={key} style={{ fontStyle: "italic" }}>
          {m[6]}
        </Text>
      );
    else if (m[8] !== undefined)
      nodes.push(
        <Text key={key} style={[MONO, { backgroundColor: colors.surface }]}>
          {" "}
          {m[8]}{" "}
        </Text>
      );
    else if (m[10] !== undefined) {
      const url = m[11];
      nodes.push(
        <Text
          key={key}
          style={{ color: colors.accent, textDecorationLine: "underline" }}
          onPress={() => void Linking.openURL(url)}
        >
          {m[10]}
        </Text>
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownText({ text }: { text: string }) {
  const c = useThemeColors();
  const colors = { text: c.text, accent: c.accent, surface: c.surface };
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let bi = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^(\d+)\.\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      continue;
    }
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <Text
          key={`b-${bi++}`}
          style={{
            color: c.text,
            fontWeight: level <= 2 ? "700" : "600",
            fontSize: level === 1 ? 16 : 15,
            marginTop: 2,
          }}
        >
          {inlineNodes(heading[2], `h-${bi}`, colors)}
        </Text>
      );
    } else if (ul || ol) {
      const marker = ul ? "•" : `${ol![1]}.`;
      const content = ul ? ul[1] : ol![2];
      blocks.push(
        <View key={`b-${bi++}`} className="flex-row gap-2">
          <Text style={{ color: c.textMuted, fontSize: 15 }}>{marker}</Text>
          <Text className="flex-1" style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
            {inlineNodes(content, `li-${bi}`, colors)}
          </Text>
        </View>
      );
    } else {
      blocks.push(
        <Text
          key={`b-${bi++}`}
          style={{ color: c.text, fontSize: 15, lineHeight: 21 }}
        >
          {inlineNodes(line, `p-${bi}`, colors)}
        </Text>
      );
    }
  }

  return <View className="gap-1.5">{blocks}</View>;
}
