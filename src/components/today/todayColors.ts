/**
 * Colores fijos del semáforo de la pantalla Hoy (overdue/today/idle), extraídos
 * de today.tsx (ver AUDITORIA_CODIGO.md). Tuplas "r,g,b" para componer alphas
 * inline vía `rgba(${RED},0.3)`; los *_T son los hex tintados para texto/iconos.
 * Hardcodeados a propósito: no dependen del tema.
 */
export const RED = "239,68,68";
export const ORANGE = "249,115,22";
export const AMBER = "245,158,11";
export const PURPLE = "168,85,247";
export const RED_T = "rgb(248,113,113)";
export const ORANGE_T = "rgb(251,146,60)";
export const AMBER_T = "rgb(251,191,36)";
export const PURPLE_T = "rgb(192,132,252)";

/** Tinte del punto de proyecto dormido, por bucket de antigüedad. */
export const sleepingDot: Record<"7-14" | "15-30" | "30+", string> = {
  "7-14": AMBER_T,
  "15-30": ORANGE_T,
  "30+": RED_T,
};
