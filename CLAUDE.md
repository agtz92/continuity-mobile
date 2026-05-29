@AGENTS.md

## Paletas de colores

Para editar las paletas (cambiar hex de una existente o agregar una nueva), consulta `docs/paletas-de-colores.md`. Resumen: aquí **no hay `globals.css`** — `src/palette/config.ts` (`PALETTE_SWATCHES`) es la fuente de verdad, leída por `src/theme/ThemeProvider.tsx`. Mantén los hex idénticos a los del repo web (`continuity`).
