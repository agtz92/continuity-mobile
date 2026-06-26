# Refactor de modularidad — app mobile

Estado del refactor de modularidad/legibilidad en el repo **mobile**, espejo del
trabajo guiado por `AUDITORIA_CODIGO.md` del repo web (`continuity/`). Documento
para **evaluar y continuar después**.

> **Verificación en mobile:** no hay test runner ni verificación visual desde el
> entorno de desarrollo del agente. El smoke test es, en este orden (regla 3 de
> `AGENTS.md`): `npx expo export -p ios --clear` y luego `npx tsc --noEmit`,
> ambos exit 0. Las regresiones **visuales** hay que verlas en device.

## Principios aplicados (igual que en web)

- **Movimientos verbatim:** el JSX se cortó tal cual a los nuevos componentes; no
  se reescribió markup.
- **Mismos nombres de identificador:** los datos/callbacks que antes venían del
  closure ahora llegan como **props con el mismo nombre** → el JSX no cambia y
  `tsc` valida que el wiring de props esté completo (si falta una prop, falla).
- **Estado de UI local adentro:** el estado de plegado/filtro (`showX`,
  `doneTodayFilter`) vive en cada componente extraído, no en la pantalla.
- **Traductores/tema por hook:** cada componente llama `useTranslation()` /
  `useThemeColors()` por su cuenta.

## Hecho

### `src/app/(dashboard)/today.tsx` (1450 → 1046 líneas)
Extraídas las **2 secciones grandes** + módulos compartidos:

| Nuevo módulo | Contenido |
|---|---|
| `src/components/today/TodayFocusSection.tsx` | sección "Enfoque de hoy" (focusTypeColor/focusBorder movidos adentro) |
| `src/components/today/DoneTodaySection.tsx` | sección "Hecho hoy" (consts taskCount/logCount/visibleDone/toggleDoneFilter + estado de filtro adentro) |
| `src/components/today/EffortBadge.tsx` | badge de horas compartido (antes el helper `effortBadge`, usado por ambas secciones) |
| `src/components/today/todayColors.ts` | tuplas de color del semáforo (RED/ORANGE/AMBER/PURPLE + `_T`) y `sleepingDot` |
| `src/components/today/todayRoutines.ts` | lógica pura de rutinas de hoy (cómputo + counts + horas) — extraído antes |

`today.tsx` ahora arma esas secciones como `<TodayFocusSection .../>` /
`<DoneTodaySection .../>`. Se limpiaron helpers/estado/imports muertos.

### `src/app/(dashboard)/(more)/analytics.tsx`
- `src/lib/analyticsConfig.ts`: `ChipId` + `CHIPS` + `RANGES` (config de paneles/rangos).

## Pendiente (mismo patrón, mecánico)

### `today.tsx` — 8 secciones chicas restantes
Siguen inline; extraer cada una a un `src/components/today/sections.tsx` (o
archivos individuales), igual que en web (`continuity/frontend/src/components/today/sections.tsx`):
`counters`, `stalled-alert`, `routines-today`, `closeable`, `sleeping`,
`stale-ideas`, `active-projects`, `launched-with-tasks`.

Notas para hacerlo:
- `jumpToProject(id)` se pasa como prop (lo usan casi todas).
- `routines-today` necesita `resolveRoutineProject` (mover adentro; depende de
  `projects` + `categoryById`) y usa `RoutineRow` + `completeOccurrence`/
  `uncompleteOccurrence`/`editRoutine`.
- `active-projects` / `launched-with-tasks` usan `ProjectCardCompact` +
  `projectProgressById`/`comebackProjectIds`/`comebackGapByProject`.
- `sleeping` usa `sleepingDot` (ya en `todayColors.ts`) — importarlo.
- Las tuplas de color (`RED`/`ORANGE`/…) hoy están **duplicadas**: definidas
  local en `today.tsx` (las usan las secciones inline) **y** en `todayColors.ts`
  (las usan las extraídas). Al terminar de extraer, borrar las locales y que
  `today.tsx` importe de `todayColors.ts`.

### `analytics.tsx` — paneles + chart
Extraer `PanelCard` (componente contenedor compartido por todos los paneles) y
`ActivityChart` (el SVG; depende de `PanelCard`) a `src/components/analytics/`,
y luego cada panel del `renderPanel` switch. El acoplamiento a `PanelCard` es la
razón por la que no se hizo aún sin verificación visual.

## Cómo verificar al continuar
```bash
cd mobile
npx expo export -p ios --clear   # regenera typed routes + bundle
npx tsc --noEmit                 # 0 errores
```
Y abrir en device/dev-build para confirmar que las secciones se ven y se
comportan igual (plegar/desplegar, completar tareas/rutinas, navegar a proyecto).
