import { View, type ViewProps } from "react-native";

import { useTourAnchor } from "./anchors";

/**
 * Marca algo como señalable por el tour.
 *
 * Es una `View` transparente que no cambia el layout: envuelve lo que ya
 * había y se limita a existir para poder medirse.
 *
 *     <TourAnchor id="tab.projects">
 *       <FolderKanban color={color} size={size} />
 *     </TourAnchor>
 *
 * El `id` es la única cuerda entre la pantalla y `steps.ts`. Convención:
 * `tab.<pestaña>` para la barra de abajo, `more.<clave del item>` para las
 * filas del menú "Más" — que se envuelven en bloque, así que **una sección
 * nueva en ese menú ya nace señalable sin tocar nada**.
 */
export function TourAnchor({
  id,
  children,
  ...rest
}: { id: string } & ViewProps) {
  const anchor = useTourAnchor(id);
  return (
    <View {...anchor} {...rest}>
      {children}
    </View>
  );
}
