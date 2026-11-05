import { Platform } from "react-native";

/** Alto por defecto de la barra de pestañas (react-navigation), sin el inset. */
export const TAB_BAR_HEIGHT = 49;

/**
 * Aire extra bajo las etiquetas en Android. Con edge-to-edge (SDK 54) el inset
 * inferior es solo la franja de la barra de gestos (~16-24 dp) y las etiquetas
 * quedaban pegadas al borde; en iOS el home indicator ya deja margen de sobra.
 */
export const TAB_BAR_EXTRA_BOTTOM = Platform.OS === "android" ? 10 : 0;
