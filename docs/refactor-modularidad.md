# Refactor de modularidad — app mobile

> **⚑ NOTA (2026-06-28):** El tracker canónico de deuda de modularidad (web + móvil) es
> `continuity/AUDITORIA_CODIGO.md`. Ese reporte marca una **regresión pendiente** que este
> doc da por cerrada: `components/analytics/panels.tsx` (923 líneas) quedó como god-file tras
> mover los paneles fuera de `analytics.tsx`. La sección "Pendiente" de abajo ("completamente
> descompuesto") está desactualizada en ese punto — ver AUDITORIA para el estado vigente.

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
| `src/components/today/sections.tsx` | las **8 secciones chicas** (counters, stalled-alert, routines-today, closeable, sleeping, stale-ideas, active-projects, launched-with-tasks) — `resolveRoutineProject` movido dentro de `RoutinesTodaySection`; colores/`sleepingDot` desde `todayColors.ts` |

`today.tsx` (**1450 → 691**) ahora solo deriva datos y arma `sectionNodes` con
`<XSection .../>` + el modo personalizar + la cola de stalled. **Las 10 secciones
están extraídas.** Se limpiaron helpers/estado/imports muertos.

> Quedan en `today.tsx` algunas tuplas de color locales (`RED`/`ORANGE`/…) que
> aún usan `SECTION_ICON` y el arreglo `counters`; las extraídas usan
> `todayColors.ts`. Unificar del todo es opcional (inocuo).

### `src/app/(dashboard)/(more)/analytics.tsx` (**1091 → 244**)
- `src/lib/analyticsConfig.ts`: `ChipId` + `CHIPS` + `RANGES` (config de paneles/rangos).
- `src/components/analytics/panels.tsx`: **todos los paneles** (`CadencePanel`,
  `ActivityChart`, `LoopPanel`, `StatusBreakdownPanel`, `BacklogPanel`,
  `WeekdayHeatmap`, `TopProjectsPanel`, `SleepingStalePanel`, `IdeaFunnelPanel`,
  `EffortPanel`) + las piezas compartidas (`PanelCard`, `StatTile`, `StatusBar`,
  `Delta`) + tuplas de color + `type T`. La pantalla `analytics.tsx` queda con el
  estado, `useAnalyticsData`, el selector de chips y el switch `renderPanel`.

## Pendiente

Mobile **completamente descompuesto** (today + analytics). No quedan pendientes de
modularidad en mobile.

## Cómo verificar al continuar
```bash
cd mobile
npx expo export -p ios --clear   # regenera typed routes + bundle
npx tsc --noEmit                 # 0 errores
```
Y abrir en device/dev-build para confirmar que las secciones se ven y se
comportan igual (plegar/desplegar, completar tareas/rutinas, navegar a proyecto).
