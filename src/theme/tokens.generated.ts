// GENERADO por scripts/generate-tokens.mjs desde src/design/tokens.json.
// NO EDITAR A MANO — los cambios se pierden en el siguiente `pnpm tokens`.
//
// COPIA del emitido en el repo web (`frontend/src/design/tokens.rn.generated.ts`).
// Los dos repos son separados, así que móvil se trae el archivo entero en vez de
// importarlo. Para refrescarlo: `pnpm tokens` en web y copiar de nuevo.
//
// NO lo consume la app en runtime: `src/theme/tokens.ts` sigue siendo lo que se
// importa. Esto es **la referencia contra la que se valida**, con
// `node scripts/check-tokens.mjs`, para que web y móvil no diverjan en silencio
// (era el riesgo 6 de MOVIL_EVALUACION.md: el archivo existía y nadie lo había
// mirado nunca).

export type ThemeName = "continuu" | "light" | "carbon";
export type PaletteName = "ocre" | "salvia" | "oxido" | "hielo" | "ciruela" | "default" | "continuuit" | "green" | "turquoise" | "pink" | "cute" | "complimentary" | "business" | "midnight" | "retro" | "neon" | "sunset" | "boho";

/** Superficies y tintas por tema, con los alias de compatibilidad resueltos. */
export const THEME_VARS: Record<ThemeName, Record<string, string>> = {
  "continuu": {
    "--canvas": "#070914",
    "--bg": "#0C0F26",
    "--surface": "#101430",
    "--surface-2": "#141935",
    "--surface-3": "#1A2044",
    "--well": "#0A0D22",
    "--scrim": "rgba(7,9,20,0.78)",
    "--text": "#F5F1E8",
    "--text-2": "#CFD3E6",
    "--text-3": "#A6ABC8",
    "--text-4": "#8A90AE",
    "--text-5": "#7B819E",
    "--text-6": "#6E7391",
    "--text-off": "#5B5F7C",
    "--signal": "#F0714E",
    "--closed": "#6FCF97",
    "--toast-bg": "#050710",
    "--toast-text": "#F5F1E8",
    "--shadow": "rgba(0,0,0,0.9)",
    "--border": "rgba(245, 241, 232, 0.10)",
    "--text-muted": "#8A90AE",
    "--accent-2": "#E08A5A"
  },
  "light": {
    "--canvas": "#E9E5DA",
    "--bg": "#F7F5EF",
    "--surface": "#FFFDF8",
    "--surface-2": "#EFEBDF",
    "--surface-3": "#E5E0D0",
    "--well": "#FBF9F3",
    "--scrim": "rgba(20,23,43,0.42)",
    "--text": "#14172B",
    "--text-2": "#34322A",
    "--text-3": "#4E4B3E",
    "--text-4": "#5B5949",
    "--text-5": "#6A6657",
    "--text-6": "#6C6A62",
    "--text-off": "#8A8778",
    "--signal": "#C0341B",
    "--closed": "#1F6B45",
    "--toast-bg": "#14172B",
    "--toast-text": "#FBF9F3",
    "--shadow": "rgba(74,62,36,0.26)",
    "--border": "rgba(92, 78, 46, 0.10)",
    "--text-muted": "#5B5949",
    "--accent-2": "#9A4A16"
  },
  "carbon": {
    "--canvas": "#0B0A09",
    "--bg": "#131210",
    "--surface": "#1A1815",
    "--surface-2": "#201D18",
    "--surface-3": "#2A2620",
    "--well": "#0F0E0C",
    "--scrim": "rgba(11,10,9,0.78)",
    "--text": "#F1EDE3",
    "--text-2": "#D6D0C2",
    "--text-3": "#A9A192",
    "--text-4": "#8B8474",
    "--text-5": "#8B8474",
    "--text-6": "#726C5F",
    "--text-off": "#635E52",
    "--signal": "#E8674A",
    "--closed": "#7FA98A",
    "--toast-bg": "#050505",
    "--toast-text": "#F1EDE3",
    "--shadow": "rgba(0,0,0,0.85)",
    "--border": "rgba(241, 237, 227, 0.10)",
    "--text-muted": "#8B8474",
    "--accent-2": "#E08A5A"
  }
};

/** [accent, accent-hi, accent-lo] por paleta y luminosidad del tema. */
export const PALETTE_VARS: Record<PaletteName, { dark: string[]; light: string[] }> = {
  "ocre": {
    "dark": [
      "#D4A847",
      "#E5BC5E",
      "#BC9036"
    ],
    "light": [
      "#8A6410",
      "#A97C1D",
      "#6B4C08"
    ]
  },
  "salvia": {
    "dark": [
      "#8FB98A",
      "#A8CEA3",
      "#6E9A69"
    ],
    "light": [
      "#3F6B45",
      "#527F58",
      "#2C5231"
    ]
  },
  "oxido": {
    "dark": [
      "#E08A5A",
      "#F0A375",
      "#B96C40"
    ],
    "light": [
      "#9A4A16",
      "#B45E27",
      "#7A390E"
    ]
  },
  "hielo": {
    "dark": [
      "#8FB4D9",
      "#A9C9EA",
      "#6E93B8"
    ],
    "light": [
      "#1F4E79",
      "#2E6494",
      "#153A5C"
    ]
  },
  "ciruela": {
    "dark": [
      "#C08AC0",
      "#D3A4D3",
      "#9C689C"
    ],
    "light": [
      "#6B2E6B",
      "#843E84",
      "#511F51"
    ]
  },
  "default": {
    "dark": [
      "#D4A847",
      "#E5BC5E",
      "#BC9036"
    ],
    "light": [
      "#8A6410",
      "#A97C1D",
      "#6B4C08"
    ]
  },
  "continuuit": {
    "dark": [
      "#D4A847",
      "#E5BC5E",
      "#BC9036"
    ],
    "light": [
      "#8A6410",
      "#A97C1D",
      "#6B4C08"
    ]
  },
  "green": {
    "dark": [
      "#8FB98A",
      "#A8CEA3",
      "#6E9A69"
    ],
    "light": [
      "#3F6B45",
      "#527F58",
      "#2C5231"
    ]
  },
  "turquoise": {
    "dark": [
      "#8FB98A",
      "#A8CEA3",
      "#6E9A69"
    ],
    "light": [
      "#3F6B45",
      "#527F58",
      "#2C5231"
    ]
  },
  "pink": {
    "dark": [
      "#C08AC0",
      "#D3A4D3",
      "#9C689C"
    ],
    "light": [
      "#6B2E6B",
      "#843E84",
      "#511F51"
    ]
  },
  "cute": {
    "dark": [
      "#C08AC0",
      "#D3A4D3",
      "#9C689C"
    ],
    "light": [
      "#6B2E6B",
      "#843E84",
      "#511F51"
    ]
  },
  "complimentary": {
    "dark": [
      "#C08AC0",
      "#D3A4D3",
      "#9C689C"
    ],
    "light": [
      "#6B2E6B",
      "#843E84",
      "#511F51"
    ]
  },
  "business": {
    "dark": [
      "#8FB4D9",
      "#A9C9EA",
      "#6E93B8"
    ],
    "light": [
      "#1F4E79",
      "#2E6494",
      "#153A5C"
    ]
  },
  "midnight": {
    "dark": [
      "#8FB4D9",
      "#A9C9EA",
      "#6E93B8"
    ],
    "light": [
      "#1F4E79",
      "#2E6494",
      "#153A5C"
    ]
  },
  "retro": {
    "dark": [
      "#8FB4D9",
      "#A9C9EA",
      "#6E93B8"
    ],
    "light": [
      "#1F4E79",
      "#2E6494",
      "#153A5C"
    ]
  },
  "neon": {
    "dark": [
      "#E08A5A",
      "#F0A375",
      "#B96C40"
    ],
    "light": [
      "#9A4A16",
      "#B45E27",
      "#7A390E"
    ]
  },
  "sunset": {
    "dark": [
      "#E08A5A",
      "#F0A375",
      "#B96C40"
    ],
    "light": [
      "#9A4A16",
      "#B45E27",
      "#7A390E"
    ]
  },
  "boho": {
    "dark": [
      "#E08A5A",
      "#F0A375",
      "#B96C40"
    ],
    "light": [
      "#9A4A16",
      "#B45E27",
      "#7A390E"
    ]
  }
};

/** Rampas alfa con el acento por defecto. RN no tiene color-mix: recalcular con
 *  `buildRamps` cuando el usuario cambie de paleta. */
export const RAMPS_DEFAULT: Record<ThemeName, Record<string, string>> = {
  "continuu": {
    "--line-03": "rgba(245, 241, 232, 0.03)",
    "--line-04": "rgba(245, 241, 232, 0.04)",
    "--line-06": "rgba(245, 241, 232, 0.06)",
    "--line-07": "rgba(245, 241, 232, 0.07)",
    "--line-08": "rgba(245, 241, 232, 0.08)",
    "--line-10": "rgba(245, 241, 232, 0.10)",
    "--line-14": "rgba(245, 241, 232, 0.14)",
    "--line-16": "rgba(245, 241, 232, 0.16)",
    "--line-18": "rgba(245, 241, 232, 0.18)",
    "--line-22": "rgba(245, 241, 232, 0.22)",
    "--line-28": "rgba(245, 241, 232, 0.28)",
    "--line-30": "rgba(245, 241, 232, 0.30)",
    "--line-34": "rgba(245, 241, 232, 0.34)",
    "--accent-a12": "rgba(212, 168, 71, 0.12)",
    "--accent-a14": "rgba(212, 168, 71, 0.14)",
    "--accent-a22": "rgba(212, 168, 71, 0.22)",
    "--accent-a35": "rgba(212, 168, 71, 0.35)",
    "--accent-a50": "rgba(212, 168, 71, 0.50)",
    "--accent-a55": "rgba(212, 168, 71, 0.55)",
    "--signal-a02": "rgba(240, 113, 78, 0.02)",
    "--signal-a03": "rgba(240, 113, 78, 0.03)",
    "--signal-a04": "rgba(240, 113, 78, 0.04)",
    "--signal-a09": "rgba(240, 113, 78, 0.09)",
    "--signal-a10": "rgba(240, 113, 78, 0.10)",
    "--signal-a12": "rgba(240, 113, 78, 0.12)",
    "--signal-a16": "rgba(240, 113, 78, 0.16)",
    "--signal-a50": "rgba(240, 113, 78, 0.50)",
    "--signal-a55": "rgba(240, 113, 78, 0.55)"
  },
  "light": {
    "--line-03": "rgba(92, 78, 46, 0.03)",
    "--line-04": "rgba(92, 78, 46, 0.04)",
    "--line-06": "rgba(92, 78, 46, 0.06)",
    "--line-07": "rgba(92, 78, 46, 0.07)",
    "--line-08": "rgba(92, 78, 46, 0.08)",
    "--line-10": "rgba(92, 78, 46, 0.10)",
    "--line-14": "rgba(92, 78, 46, 0.14)",
    "--line-16": "rgba(92, 78, 46, 0.16)",
    "--line-18": "rgba(92, 78, 46, 0.18)",
    "--line-22": "rgba(92, 78, 46, 0.22)",
    "--line-28": "rgba(92, 78, 46, 0.28)",
    "--line-30": "rgba(92, 78, 46, 0.30)",
    "--line-34": "rgba(92, 78, 46, 0.34)",
    "--accent-a12": "rgba(212, 168, 71, 0.12)",
    "--accent-a14": "rgba(212, 168, 71, 0.14)",
    "--accent-a22": "rgba(212, 168, 71, 0.22)",
    "--accent-a35": "rgba(212, 168, 71, 0.35)",
    "--accent-a50": "rgba(212, 168, 71, 0.50)",
    "--accent-a55": "rgba(212, 168, 71, 0.55)",
    "--signal-a02": "rgba(192, 52, 27, 0.02)",
    "--signal-a03": "rgba(192, 52, 27, 0.03)",
    "--signal-a04": "rgba(192, 52, 27, 0.04)",
    "--signal-a09": "rgba(192, 52, 27, 0.09)",
    "--signal-a10": "rgba(192, 52, 27, 0.10)",
    "--signal-a12": "rgba(192, 52, 27, 0.12)",
    "--signal-a16": "rgba(192, 52, 27, 0.16)",
    "--signal-a50": "rgba(192, 52, 27, 0.50)",
    "--signal-a55": "rgba(192, 52, 27, 0.55)"
  },
  "carbon": {
    "--line-03": "rgba(241, 237, 227, 0.03)",
    "--line-04": "rgba(241, 237, 227, 0.04)",
    "--line-06": "rgba(241, 237, 227, 0.06)",
    "--line-07": "rgba(241, 237, 227, 0.07)",
    "--line-08": "rgba(241, 237, 227, 0.08)",
    "--line-10": "rgba(241, 237, 227, 0.10)",
    "--line-14": "rgba(241, 237, 227, 0.14)",
    "--line-16": "rgba(241, 237, 227, 0.16)",
    "--line-18": "rgba(241, 237, 227, 0.18)",
    "--line-22": "rgba(241, 237, 227, 0.22)",
    "--line-28": "rgba(241, 237, 227, 0.28)",
    "--line-30": "rgba(241, 237, 227, 0.30)",
    "--line-34": "rgba(241, 237, 227, 0.34)",
    "--accent-a12": "rgba(212, 168, 71, 0.12)",
    "--accent-a14": "rgba(212, 168, 71, 0.14)",
    "--accent-a22": "rgba(212, 168, 71, 0.22)",
    "--accent-a35": "rgba(212, 168, 71, 0.35)",
    "--accent-a50": "rgba(212, 168, 71, 0.50)",
    "--accent-a55": "rgba(212, 168, 71, 0.55)",
    "--signal-a02": "rgba(232, 103, 74, 0.02)",
    "--signal-a03": "rgba(232, 103, 74, 0.03)",
    "--signal-a04": "rgba(232, 103, 74, 0.04)",
    "--signal-a09": "rgba(232, 103, 74, 0.09)",
    "--signal-a10": "rgba(232, 103, 74, 0.10)",
    "--signal-a12": "rgba(232, 103, 74, 0.12)",
    "--signal-a16": "rgba(232, 103, 74, 0.16)",
    "--signal-a50": "rgba(232, 103, 74, 0.50)",
    "--signal-a55": "rgba(232, 103, 74, 0.55)"
  }
};
