# Cómo editar las paletas de colores (móvil)

A diferencia de la web, **el móvil no tiene `globals.css`**. Aquí `PALETTE_SWATCHES` en `src/palette/config.ts` **es la fuente de verdad** de los colores reales, no solo del preview.

## Por qué config.ts manda

`src/theme/ThemeProvider.tsx` lee directamente el par de la paleta activa y lo inyecta como variables vía `vars()` de NativeWind:

```ts
const [accent, accent2] = PALETTE_SWATCHES[palette][effective];
return vars({
  // ...superficies desde THEME_SURFACES...
  "--accent": accent,
  "--accent-2": accent2,
});
```

`effective` es `"dark" | "light" | "continuuit"` (el `"system"` se resuelve a light/dark). Las superficies (`--bg`, `--surface`, etc.) salen de `src/theme/tokens.ts` (`THEME_SURFACES`), **no** de la paleta. La paleta solo controla `--accent` y `--accent-2`.

## Editar una paleta existente (caso típico)

Edita solo el objeto de la paleta en `PALETTE_SWATCHES` (`src/palette/config.ts`):

```ts
cute: {
  dark: ["#C0E1D2", "#DC9B9B"],
  light: ["#EF88AD", "#9BC09C"],
  continuuit: ["#C0E1D2", "#DC9B9B"],  // por convención espeja dark
},
```

**Regla del campo `continuuit`:** espeja los accents de `dark`, igual que en web. Si cambias dark, cambia continuuit con los mismos hex (salvo que quieras que difieran a propósito).

**Caso especial — la paleta `continuuit`:** es la única que NO varía por tema. Sus tres campos (`dark`, `light`, `continuuit`) usan el mismo par, los accents de marca `#D4A847` / `#F08C5C`, para que se vea igual que el tema continuuit sin importar si el tema activo es light o dark. Mantén los tres idénticos:

```ts
continuuit: {
  dark: ["#D4A847", "#F08C5C"],
  light: ["#D4A847", "#F08C5C"],
  continuuit: ["#D4A847", "#F08C5C"],
},
```

No hay un segundo archivo que sincronizar para los colores — con esto basta.

## Agregar una paleta nueva

En `src/palette/config.ts`:
- Agrega el nombre a `SUPPORTED_PALETTES`.
- Agrega su entrada en `PALETTE_LABEL_KEY` (ej. `nueva: "paletteNueva"`).
- Agrega su objeto en `PALETTE_SWATCHES` con los tres pares (`dark`, `light`, `continuuit`).
- Agrega la traducción de la key (`paletteNueva`) en `src/messages/en.json` y `src/messages/es.json`.

## Mantener paridad con la web

Los valores de cada paleta deben ser **idénticos** a los del repo web. Web tiene una copia en `frontend/src/palette/config.ts` (`PALETTE_SWATCHES`) y en `frontend/src/app/globals.css`. Al cambiar una paleta, actualiza ambos repos. Ver `continuity/docs/paletas-de-colores.md`.
