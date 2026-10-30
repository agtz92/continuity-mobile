"use client";

/**
 * Piezas compartidas de la pantalla de Analítica (mobile) y el juego de colores
 * por serie. Cada panel vive en su propio archivo de esta carpeta
 * (`CadencePanel.tsx`, `ActivityChart.tsx`, …) y toma de aquí `PanelCard`,
 * `StatTile`, `StatusBar`, `Delta` y los colores.
 *
 * Este es el **único** archivo con colores propios fuera de `src/theme` y
 * `src/palette` (decisión del dueño, ver AGENTS.md): aquí el color identifica
 * una serie. Los paneles importan las constantes; no declaran literales.
 */

import { type ReactNode } from "react";
import { Figure } from "@/components/ui/Figure";
import { Meta } from "@/components/ui/Meta";
import { Text, View } from "react-native";
import { ArrowDown, ArrowUp, Minus } from "lucide-react-native";
import { type ThemeColors } from "@/theme/useThemeColors";


export type T = (key: string, params?: Record<string, string | number>) => string;

export const AMBER = "rgb(251,191,36)";
export const ROSE = "rgb(251,113,133)";
export const PURPLE = "rgb(192,132,252)";
export const CYAN = "rgb(34,211,238)";
export const INDIGO = "rgb(129,140,248)";
export const PINK = "rgb(244,114,182)";
export const ORANGE = "rgb(251,146,60)";
export const YELLOW = "rgb(250,204,21)";
export const EMERALD = "rgb(52,211,153)";
export const BLUE = "rgb(96,165,250)";
export const RED = "rgb(239,68,68)";

/** Tarjeta contenedora común a todos los paneles: encabezado (icono + título +
 *  subtítulo opcional) sobre un cuerpo arbitrario. Unifica el chrome para que cada
 *  panel solo aporte su contenido. */
export function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface p-4">
      <View className="mb-3">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className="text-sm font-sans-semibold text-text">{title}</Text>
        </View>
        {subtitle ? (
          <Text className="font-sans mt-0.5 text-xs text-text-muted">{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Casilla de métrica reutilizable (valor grande + etiqueta, sufijo y color de tono
 *  opcionales). Con `icon` la etiqueta va arriba junto al icono; sin él va debajo,
 *  para acomodar tanto tiles compactas como destacadas. */
export function StatTile({
  value,
  suffix,
  label,
  tone,
  icon,
}: {
  value: number | string;
  suffix?: string;
  label: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-bg p-3">
      {icon && (
        <View className="mb-1 flex-row items-center gap-1.5">
          {icon}
          <Text className="font-sans text-[11px] text-text-muted">{label}</Text>
        </View>
      )}
      {/* La cifra en display y tabular: una columna de números que baila al
          refrescar es lo que hacía que el panel se leyera como una hoja de
          cálculo mal alineada. El sufijo se queda pequeño y apagado — es la
          unidad, no el dato. */}
      <View className="flex-row items-baseline gap-1">
        <Figure tone={tone}>{value}</Figure>
        {suffix ? <Meta tone="faint">{suffix}</Meta> : null}
      </View>
      {!icon && <Meta variant="cintillo" tone="muted" className="mt-1">{label}</Meta>}
    </View>
  );
}

/** Barra de progreso horizontal de una sola fila (etiqueta + conteo encima, barra
 *  rellena por porcentaje debajo). Usada en el breakdown por estado; el ancho se
 *  deriva de count/total y se pinta con el color del estado. */
export function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View>
      <View className="mb-1 flex-row justify-between">
        <Text className="font-sans text-xs text-text-muted">{label}</Text>
        <Text className="font-sans text-xs text-text-muted">{count}</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-border">
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Indicador de variación vs. periodo previo: flecha + cifra coloreada según signo
 *  (acento al subir, rosa al bajar, guion neutro en 0). */
export function Delta({ value, c }: { value: number; c: ThemeColors }) {
  if (value === 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <Minus size={12} color={c.textMuted} />
        <Text className="font-sans text-xs text-text-muted">0</Text>
      </View>
    );
  }
  if (value > 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <ArrowUp size={12} color={c.accent} />
        <Text className="font-sans text-xs text-accent">+{value}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-0.5">
      <ArrowDown size={12} color={ROSE} />
      <Text className="font-sans text-xs" style={{ color: ROSE }}>
        {value}
      </Text>
    </View>
  );
}
