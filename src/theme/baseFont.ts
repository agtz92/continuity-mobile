import React from "react";
import { Text, TextInput } from "react-native";

/**
 * La fuente base de toda la app, sin tocar 400 llamadas.
 *
 * NativeWind solo aplica la familia donde escribes una clase `font-*`, y en
 * esta app la mayoría de los `<Text>` no llevan ninguna: sin esto, el rediseño
 * tipográfico solo se vería en los sitios nuevos y el resto seguiría con la
 * fuente del sistema. Parchear el `render` de `Text`/`TextInput` una sola vez,
 * antes del primer render, es la forma estándar en RN de fijar una familia por
 * defecto — `defaultProps` ya no funciona en componentes de función.
 *
 * El estilo propio va **primero** en el array: cualquier `style` o `className`
 * del sitio de llamada lo pisa, que es justo lo que queremos para los
 * titulares (`font-display`) y los pesos (`font-sans-medium`, etc.).
 *
 * ⚠️ Cada peso de Schibsted es **una familia distinta**, así que `fontWeight`
 * no lo sube: para eso están las clases `font-sans-medium/semibold/bold`. Un
 * `font-sans-bold` a secas dejaría el peso 400 con negrita sintética.
 */
const BASE = "SchibstedGrotesk_400Regular";

let applied = false;

export function applyBaseFont(): void {
  if (applied) return;
  applied = true;

  for (const Comp of [Text, TextInput] as unknown as {
    render?: (...args: unknown[]) => React.ReactElement;
  }[]) {
    const original = Comp.render;
    if (typeof original !== "function") continue;
    Comp.render = function patched(...args: unknown[]) {
      const el = original.apply(this, args);
      return React.cloneElement(el, {
        style: [{ fontFamily: BASE }, (el.props as { style?: unknown }).style],
      } as never);
    };
  }
}
