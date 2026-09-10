import { Text, type TextProps } from "react-native";

/**
 * El metadato del sistema. Sustituye los `text-xs text-text-muted` repartidos
 * por las pantallas.
 *
 * Dos variantes y no más:
 *
 * - **`cintillo`** — etiqueta de sección, en versalitas con tracking amplio.
 *   Es lo que sustituyó a la familia mono del diseño anterior.
 * - **`dato`** — fecha, contador, cifra. Sin versalitas pero con
 *   `tabular-nums`, para que una columna de números no baile al cambiar de
 *   valor.
 *
 * `tone="inherit"` deja el color al padre: hace falta cuando el metadato vive
 * dentro de algo que ya decidió su color (un badge de bloqueo, por ejemplo).
 */
export type MetaVariant = "cintillo" | "dato";
export type MetaTone = "muted" | "faint" | "inherit";

const TONE: Record<MetaTone, string> = {
  muted: "text-text-3",
  faint: "text-text-5",
  inherit: "",
};

export function Meta({
  variant = "dato",
  tone = "faint",
  className = "",
  style,
  children,
  ...rest
}: {
  variant?: MetaVariant;
  tone?: MetaTone;
  className?: string;
} & TextProps) {
  // Cadena siempre concatenada, nunca `undefined | string`: un className que
  // alterna crashea Expo Go (regla 4 de AGENTS.md).
  const base =
    variant === "cintillo"
      ? "text-[11px] font-sans-semibold uppercase"
      : "text-[11px] font-sans-semibold";

  return (
    <Text
      className={`${base} ${TONE[tone]} ${className}`}
      style={[
        variant === "cintillo"
          ? { letterSpacing: 1.5 }
          : { letterSpacing: 0.2 },
        // `fontVariant` no se puede expresar por clase en NativeWind.
        { fontVariant: ["tabular-nums"] },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
