@AGENTS.md

## Paletas de colores

Para editar las paletas (cambiar hex de una existente o agregar una nueva), consulta `docs/paletas-de-colores.md`. Resumen: aquí **no hay `globals.css`** — `src/palette/config.ts` (`PALETTE_SWATCHES`) es la fuente de verdad, leída por `src/theme/ThemeProvider.tsx`. Mantén los hex idénticos a los del repo web (`continuity`).

## Reportar bug / Feedback (usuario → admin, one-way)

El usuario envía un reporte de bug que llega al **inbox de admin** (solo web). Canal de un solo sentido — **sin respuestas**. El admin portal queda fuera del móvil (regla 10), así que aquí solo existe el lado de **envío**.

- **Pantalla:** `src/app/(dashboard)/(more)/report-bug.tsx`, registrada como `Stack.Screen` en `(more)/_layout.tsx` y enlazada desde el menú "más" (`more.tsx`, icono `Bug`, `href:"/report-bug"`).
- **Selector de tema:** `src/components/ui/BugTopicSelect.tsx` — trigger + `BottomSheet` con búsqueda y opción de **texto libre** ("Usar «…»"). Sigue el patrón de `ProjectSelect`.
- **Fuente de verdad de temas:** `src/lib/bugTopics.ts` — **espejo exacto** de `continuity/frontend/src/lib/bugTopics.ts` (mismos `value` y orden). Etiquetas i18n `bugTopics.<value>`; textos en `reportBug.*` (`src/messages/{en,es}.json`). Recuerda ICU llave simple: `reportBug.useTyped` usa `{query}`.
- **Datos:** `SUBMIT_BUG_REPORT` en `src/lib/graphql.ts` (`platform:"app"`) + hook `src/hooks/useReportMutations.ts` (devuelve boolean, errores se muestran con `toast` en la pantalla). Backend: app `core/feedback`.
