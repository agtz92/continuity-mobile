export const AVATAR_STYLES = ["3d", "anime", "8bit", "vector"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export type Avatar = {
  id: string;
  style: AvatarStyle;
  slug: string;
  nameKey: string;
};

const CHARACTERS: { slug: string; nameKey: string }[] = [
  { slug: "momo", nameKey: "momo" },
  { slug: "yuki", nameKey: "yuki" },
  { slug: "tako", nameKey: "tako" },
  { slug: "kuma", nameKey: "kuma" },
  { slug: "hoshi", nameKey: "hoshi" },
  { slug: "pip", nameKey: "pip" },
  { slug: "tetsu", nameKey: "tetsu" },
];

export const AVATAR_CATALOG: Avatar[] = AVATAR_STYLES.flatMap((style) =>
  CHARACTERS.map((c) => ({
    id: `${style}/${c.slug}`,
    style,
    slug: c.slug,
    nameKey: c.nameKey,
  })),
);

export function getAvatarUrl(id: string): string {
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${id}.webp`;
}

export function isValidAvatarId(id: string | null | undefined): id is string {
  return !!id && AVATAR_CATALOG.some((a) => a.id === id);
}

export function avatarsByStyle(): Record<AvatarStyle, Avatar[]> {
  const out = {} as Record<AvatarStyle, Avatar[]>;
  for (const style of AVATAR_STYLES) out[style] = [];
  for (const a of AVATAR_CATALOG) out[a.style].push(a);
  return out;
}
