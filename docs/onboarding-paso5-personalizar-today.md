# Onboarding · Paso 5 — Personalizar el Today view (móvil)

Paso final del onboarding que presenta el editor del **Today view** y abre el
modo de edición (mostrar/ocultar/reordenar secciones). Espejo del cambio en web
(`continuity/frontend`). Voz de marca igual al resto del onboarding y localizado
en/es.

## Flujo

Onboarding pasa de **4 a 5 pasos** (Nombre · Tema · Avatar · Plan ·
**Personalizar Today**). El paso 4 ya no completa el onboarding: su botón
primario avanza al paso 5 (`onContinue → goToStep(5)`).

Paso 5 (`Step5Customize`):

- **Primario "Personalizar Today"** → `finishWithCustomize()`: completa el
  onboarding, marca el tour como omitido y abre el editor del Today.
- **Secundario** → "Quizás después" (`finish()`, tour normal) / "Listo" (replay).
- **Replay**: además "Ver el tour del dashboard otra vez" (`watchTour`).

## Hand-off cross-screen (sin params)

Enhebrar params por los layouts anidados de expo-router es frágil, así que se usa
el mismo pub/sub de `src/lib/tour.ts` que el tour:

- `requestCustomize()` — arma un flag one-shot (lo llama `finishWithCustomize`).
- `consumeCustomizeRequest()` / `subscribeCustomize()` — `today.tsx` los consume
  al montar y abre `layout.setEditMode(true)`.

### Tour vs editor

El `DashboardTour` (montado en `src/app/(dashboard)/_layout.tsx`) auto-arranca
con `tourStatus === "pending"`. Para que no comparta pantalla con el editor, la
ruta de personalizar hace `markTour(seen:false)` con `awaitRefetchQueries` antes
de navegar (solo first-time; replay no toca el tour).

## Archivos tocados

- `src/components/onboarding/Step5Customize.tsx` — **nuevo**.
- `src/app/onboarding.tsx` — `TOTAL_STEPS = 5`, `finishWithCustomize`, render del
  paso 5, paso 4 con `onContinue`.
- `src/components/onboarding/Step4Plan.tsx` — `onFinish`/`onWatchTour` →
  `onContinue` (labels a `onboarding.continue`); se quitó el watch-tour.
- `src/lib/tour.ts` — `requestCustomize` / `consumeCustomizeRequest` /
  `subscribeCustomize`.
- `src/app/(dashboard)/today.tsx` — consume el flag y abre el editor.
- `src/messages/{en,es}.json` — bloque `onboarding.step5` (ICU llave simple).

## Verificación

```bash
npx expo export -p ios --clear   # regenera typed routes (no hay rutas nuevas)
npx tsc --noEmit                 # debe salir exit 0
```
