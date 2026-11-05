import type { ImageSourcePropType } from "react-native";

/**
 * Catálogo de avatares: los siete personajes de The Loop Society, solo en
 * estilo vector. Las imágenes van empaquetadas en el binario
 * (`assets/avatars/vector/`, miniaturas de 256 px ≈8 KB c/u), así que el
 * picker del onboarding pinta al instante y sin red.
 *
 * Hasta 2026-11 hubo cuatro estilos (`3d`, `anime`, `8bit`, `vector`). Los ids
 * viejos que sigan guardados se traducen al mismo personaje en vector con
 * `normalizeAvatarId`. Espejo de `continuity/frontend/src/lib/avatars.ts` y
 * `backend/core/services/profiles.py`.
 */
export type Avatar = {
  id: string;
  slug: string;
  nameKey: string;
};

const STYLE = "vector";
const LEGACY_STYLES = ["3d", "anime", "8bit"];

// `require` tiene que ser literal para que Metro empaquete cada archivo.
const SOURCES: Record<string, ImageSourcePropType> = {
  momo: require("../../assets/avatars/vector/momo.webp"),
  yuki: require("../../assets/avatars/vector/yuki.webp"),
  tako: require("../../assets/avatars/vector/tako.webp"),
  kuma: require("../../assets/avatars/vector/kuma.webp"),
  hoshi: require("../../assets/avatars/vector/hoshi.webp"),
  pip: require("../../assets/avatars/vector/pip.webp"),
  tetsu: require("../../assets/avatars/vector/tetsu.webp"),
};

export const AVATAR_CATALOG: Avatar[] = Object.keys(SOURCES).map((slug) => ({
  id: `${STYLE}/${slug}`,
  slug,
  nameKey: slug,
}));

/** Traduce un id viejo (`3d/momo`) a su equivalente vigente (`vector/momo`). */
export function normalizeAvatarId(id: string | null | undefined): string | null {
  if (!id) return null;
  const [style, slug] = id.split("/");
  if (LEGACY_STYLES.includes(style)) return `${STYLE}/${slug}`;
  return id;
}

export function getAvatarSource(id: string): ImageSourcePropType | null {
  const n = normalizeAvatarId(id);
  const slug = n?.split("/")[1];
  return slug ? (SOURCES[slug] ?? null) : null;
}

export function isValidAvatarId(id: string | null | undefined): id is string {
  const n = normalizeAvatarId(id);
  return !!n && AVATAR_CATALOG.some((a) => a.id === n);
}
