/**
 * Configuración de la pantalla de Analíticas (mobile): identificadores de panel
 * y rangos de tiempo. Extraído del componente (ver AUDITORIA_CODIGO.md) para
 * separar la config de la UI.
 */

import type { AnalyticsRange } from "@/lib/types";

export type ChipId =
  | "activity"
  | "cadence"
  | "status"
  | "backlog"
  | "weekday"
  | "topProjects"
  | "sleeping"
  | "funnel"
  | "effort";

// El orden de CHIPS define el orden visual de los selectores; difiere a propósito
// del orden de declaración de ChipId (funnel/effort se adelantan a topProjects/sleeping).
export const CHIPS: ChipId[] = [
  "activity",
  "cadence",
  "status",
  "backlog",
  "weekday",
  "funnel",
  "effort",
  "topProjects",
  "sleeping",
];

export const RANGES: {
  value: AnalyticsRange;
  key: "7d" | "30d" | "90d" | "1y" | "all";
}[] = [
  { value: "LAST_7_DAYS", key: "7d" },
  { value: "LAST_30_DAYS", key: "30d" },
  { value: "LAST_90_DAYS", key: "90d" },
  { value: "LAST_365_DAYS", key: "1y" },
  { value: "ALL_TIME", key: "all" },
];
