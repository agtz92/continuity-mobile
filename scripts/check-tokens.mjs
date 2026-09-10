/**
 * Valida que los tokens de móvil no hayan divergido de los de web.
 *
 * `src/theme/tokens.generated.ts` es la copia del archivo que emite
 * `pnpm tokens` en el repo web desde `src/design/tokens.json`. `src/theme/
 * tokens.ts` y `src/palette/config.ts` son lo que la app consume de verdad.
 * Este script compara los dos y sale != 0 en cuanto se separan.
 *
 * Existe porque el archivo generado llevaba meses emitiéndose **sin que nadie
 * lo hubiera mirado nunca** (riesgo 6 de MOVIL_EVALUACION.md): compilaba, y eso
 * era todo lo que se sabía de él. Un archivo que nadie lee no es una fuente de
 * verdad, es un archivo.
 *
 *   node scripts/check-tokens.mjs
 *
 * Se lee con regex a propósito: sin runner de tests ni paso de build, un script
 * de Node sin dependencias es lo único que se puede correr en cualquier sitio.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

/** Extrae `export const NAME[: Tipo] = {...};` y lo evalúa como objeto JS. */
function block(src, name) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`no encuentro ${name}`);
  // El `{` a buscar es el que sigue al `=`, no el de la anotación de tipo:
  // `Record<Palette, { dark: string[] }>` tiene llaves y viene antes.
  const eq = src.indexOf("=", start + `export const ${name}`.length);
  const open = src.indexOf("{", eq);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  return new Function(`return (${src.slice(open, i + 1)})`)();
}

const gen = read("src/theme/tokens.generated.ts");
const mob = read("src/theme/tokens.ts");
const pal = read("src/palette/config.ts");

const THEME_VARS = block(gen, "THEME_VARS");
const PALETTE_VARS = block(gen, "PALETTE_VARS");
const THEME_SURFACES = block(mob, "THEME_SURFACES");
const PALETTE_ACCENTS = block(pal, "PALETTE_ACCENTS");

// Nombre de la var CSS -> clave del objeto de móvil. Solo lo que móvil expone;
// lo que web tiene de más (--surface-3, --text-6…) no es divergencia.
const MAP = {
  "--canvas": "canvas",
  "--bg": "bg",
  "--surface": "surface",
  "--surface-2": "surface2",
  "--surface-3": "surface3",
  "--well": "well",
  "--text": "text",
  "--text-2": "text2",
  "--text-3": "text3",
  "--text-4": "text4",
  "--text-5": "text5",
  "--text-off": "textOff",
  "--signal": "signal",
  "--closed": "closed",
  "--toast-bg": "toastBg",
  "--toast-text": "toastText",
  "--shadow": "shadow",
  "--text-muted": "textMuted",
  "--accent-2": "accent2",
};

const problems = [];
const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, "");

for (const theme of Object.keys(THEME_VARS)) {
  const surfaces = THEME_SURFACES[theme];
  if (!surfaces) {
    problems.push(`tema "${theme}" existe en web y no en móvil`);
    continue;
  }
  for (const [cssVar, key] of Object.entries(MAP)) {
    const web = THEME_VARS[theme][cssVar];
    if (web === undefined) continue;
    if (norm(web) !== norm(surfaces[key])) {
      problems.push(
        `${theme}.${key}: móvil "${surfaces[key]}" ≠ web ${cssVar} "${web}"`
      );
    }
  }
}

// Las paletas del rediseño. Las heredadas viven solo en web (móvil las traduce
// con LEGACY_PALETTE_MAP), así que solo se comparan las que móvil declara.
for (const palette of Object.keys(PALETTE_ACCENTS)) {
  const web = PALETTE_VARS[palette];
  if (!web) {
    problems.push(`paleta "${palette}" existe en móvil y no en web`);
    continue;
  }
  for (const mode of ["dark", "light"]) {
    const a = PALETTE_ACCENTS[palette][mode];
    const b = web[mode];
    if (a.length !== b.length || a.some((v, i) => norm(v) !== norm(b[i]))) {
      problems.push(
        `paleta ${palette}.${mode}: móvil [${a}] ≠ web [${b}]`
      );
    }
  }
}

if (problems.length) {
  console.error("Tokens divergentes entre web y móvil:\n");
  for (const p of problems) console.error("  ·", p);
  console.error(
    `\n${problems.length} diferencia(s). Corre \`pnpm tokens\` en web, copia` +
      " src/design/tokens.rn.generated.ts a src/theme/tokens.generated.ts y" +
      " ajusta src/theme/tokens.ts / src/palette/config.ts."
  );
  process.exit(1);
}

console.log(
  `Tokens OK: ${Object.keys(THEME_VARS).length} temas y` +
    ` ${Object.keys(PALETTE_ACCENTS).length} paletas coinciden con web.`
);
