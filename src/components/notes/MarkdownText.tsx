import { Markdown } from "@/components/markdown/Markdown";

/**
 * El renderizador de notas.
 *
 * Era propio, con su propia gramática, mientras el chat no renderizaba nada.
 * Ahora los dos usan `components/markdown`, que es el port verbatim del parser
 * de web — así una nota y una respuesta de Loop entienden exactamente el mismo
 * markdown, y arreglar un caso borde lo arregla en los dos sitios.
 *
 * Se conserva el nombre porque lo usan varios call sites y renombrarlos no
 * aportaba nada.
 */
export function MarkdownText({ text }: { text: string }) {
  return <Markdown text={text} variant="note" />;
}
