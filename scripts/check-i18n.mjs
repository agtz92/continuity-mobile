/**
 * Valida que los textos de móvil no hayan divergido de los de web.
 *
 * Web (`frontend/messages/*.json`, next-intl) y móvil (`src/messages/*.json`,
 * i18next) son catálogos **separados**: móvil empezó como copia de web y desde
 * entonces cada uno se edita por su lado. El test de web solo cuida que en/es
 * cuadren entre sí dentro de web; nada avisaba cuando un texto cambiaba en web
 * y móvil se quedaba con el viejo ("loose" → "uncategorized" se hizo a mano en
 * los dos).
 *
 *   node scripts/check-i18n.mjs            # reporte + exit 1 si hay divergencias
 *   node scripts/check-i18n.mjs --verbose  # además lista las claves solo-web / solo-móvil
 *
 * Qué compara, por idioma:
 *   - **Divergente**: la misma clave existe en web y en móvil con distinto texto.
 *     Es lo único que hace fallar el script.
 *   - **Solo web / solo móvil**: informativo. Móvil no tiene todas las pantallas
 *     de web (admin, CMS…), así que es normal que falten claves.
 *
 * Un texto que difiere **a propósito** (móvil más corto por espacio, otra
 * plataforma…) va en `scripts/i18n-parity-allow.json` con su motivo:
 *   { "views.today.title": "más corto en móvil por el header" }
 *
 * La ruta de web se toma de `CONTINUITY_WEB` o, por defecto, `../frontend`
 * (móvil vive dentro de `C:\GitHub\continuity\`).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = resolve(process.env.CONTINUITY_WEB ?? join(ROOT, "..", "frontend"));
const LOCALES = ["en", "es"];
const VERBOSE = process.argv.includes("--verbose");

if (!existsSync(join(WEB, "messages"))) {
  console.error(`No encuentro ${join(WEB, "messages")}. Define CONTINUITY_WEB con la ruta del frontend web.`);
  process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Aplana a { "a.b.c": "texto" }. */
function flatten(tree, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, path, out);
    else out[path] = String(v);
  }
  return out;
}

const allowPath = join(ROOT, "scripts", "i18n-parity-allow.json");
const allow = existsSync(allowPath) ? readJson(allowPath) : {};

let diverged = 0;
const usedAllow = new Set();

for (const locale of LOCALES) {
  const web = flatten(readJson(join(WEB, "messages", `${locale}.json`)));
  const mob = flatten(readJson(join(ROOT, "src", "messages", `${locale}.json`)));

  const shared = Object.keys(mob).filter((k) => k in web);
  const onlyWeb = Object.keys(web).filter((k) => !(k in mob));
  const onlyMob = Object.keys(mob).filter((k) => !(k in web));
  const diff = shared.filter((k) => {
    if (web[k] === mob[k]) return false;
    if (k in allow) {
      usedAllow.add(k);
      return false;
    }
    return true;
  });

  console.log(
    `\n[${locale}] compartidas ${shared.length} · divergentes ${diff.length} · solo web ${onlyWeb.length} · solo móvil ${onlyMob.length}`,
  );
  for (const k of diff) {
    console.log(`  ✗ ${k}\n      web:   ${JSON.stringify(web[k])}\n      móvil: ${JSON.stringify(mob[k])}`);
  }
  if (VERBOSE) {
    for (const k of onlyWeb) console.log(`  · solo web:   ${k}`);
    for (const k of onlyMob) console.log(`  · solo móvil: ${k}`);
  }
  diverged += diff.length;
}

const stale = Object.keys(allow).filter((k) => !usedAllow.has(k));
if (stale.length) {
  console.log(`\nAllowlist con entradas que ya no divergen (se pueden borrar): ${stale.join(", ")}`);
}

if (diverged) {
  console.log(
    `\n${diverged} texto(s) divergente(s). Alinea móvil con web, o si es a propósito agrégalo a scripts/i18n-parity-allow.json con el motivo.`,
  );
  process.exit(1);
}
console.log("\nOK: los textos compartidos coinciden entre web y móvil.");
