@AGENTS.md

## Navegación — back button visible en el stack `(more)`

Todas las pantallas con header del stack `(more)` usan un **`headerLeft` compartido**
(`src/components/ui/HeaderBackButton.tsx`, flecha `ArrowLeft` temática de 24 px en caja de 44) definido en
`(more)/_layout.tsx` con `headerBackVisible:false`. Motivo: el chevron nativo de iOS
era demasiado sutil (a veces solo la flecha, etiquetada con el título previo) y los
usuarios no notaban que el header era tocable. El botón se oculta solo cuando
`canGoBack === false`. Las pantallas presentadas como **modal** usan su propia **X**
(`FormScaffold`, con "Cancel" como texto); el chat usa una **X** propia en su header.
Desde el rediseño Breathe la flecha lleva el **nombre del destino** ("More", "Notes",
"Projects"): `headerOptionsFor(s, { backLabel, bare })`. Con `bare` la cabecera no lleva
título y la pantalla abre con su propio `ScreenHeadline`.

## Safe-area — `SafeAreaProvider` en el root (obligatorio)

`src/app/_layout.tsx` envuelve todo en `<SafeAreaProvider initialMetrics={initialWindowMetrics}>`.
Sin él, `SafeAreaView`/`useSafeAreaInsets` reportaban **0** dentro del
`fullScreenModal` del chat (host view propio) y la **X de cerrar quedaba bajo el
notch, intocable**. El header del chat (`src/app/assistant.tsx`) ya no depende del
edge `top` del `SafeAreaView`: aplica `paddingTop: insets.top + 8` explícito. Regla:
cualquier pantalla presentada como modal/fullScreenModal debe padear con
`useSafeAreaInsets()`, no confiar solo en el edge top.

## Asistente "Loop" + FAB speed-dial

El asistente IA se llama **Loop** (mascota de marca). Strings en `assistant.*`
(`title:"Loop"`, `buttonLabel:"Abrir Loop"/"Open Loop"`, `openTooltip`,
`message.working`); se mantiene "Claude" solo en `subtitle` como crédito del modelo.
Mismo rebautizo en el repo web (`continuity/frontend`).

`src/components/ui/FAB.tsx` es un **speed-dial**: al tocar el `+` se despliegan dos
acciones etiquetadas — la acción primaria de la pantalla (crear) y **"Abrir Loop"**
(`Sparkles`, `router.push("/assistant")`), horneada en el componente para que TODAS
las pantallas con FAB expongan el asistente sin wiring por pantalla. Un scrim a
pantalla completa cierra; el icono `+` rota 45° (se lee como ×). Haptics: `impact`
light al abrir, `selection` al elegir. La firma del FAB no cambió (`icon/onPress/
label/bottomOffset`), así que los 6 call sites siguen igual.

## Captura rápida (hoja desde el `+`)

Referencia completa: **`../continuity/docs/captura-rapida.md`**.

- Vive en `src/components/capture/CaptureSheet.tsx` y se abre desde el **speed-dial del FAB**
  (`ui/FAB.tsx`, junto a "Abrir Loop"), no desde una sexta pestaña: el `+` ya es "crear" aquí.
- `src/lib/quickParse.ts` y `src/lib/quickDate.ts` son **espejos literales** de los de la web
  (`continuity/frontend/src/lib/`). Los tests viven allá; cualquier cambio se hace allá y se copia.
  Si divergen, la misma línea crea cosas distintas en el teléfono y en el escritorio.
- Sintaxis: `#proyecto` · `@mañana 9:30` · `~30m` · `!qué lo bloquea` · `/tipo`. Un sigilo solo
  cuenta al principio de palabra; duplicarlo lo escribe literal.
- El bloqueo viaja **dentro** de `createTask` (`blocker`), no como segunda mutation.
- i18n en `capture.*` (ICU llave simple).

## Haptics (`src/lib/feedback.ts`)

Helpers guardados (import dinámico de `expo-haptics`, `default ?? mod` por interop):
`confirmCompleted` (success, completar tarea/rutina), `selectionFeedback` (toggles,
FAB, reordenar), `deleteFeedback` (patrón **Warning**, borrados) e `impactFeedback`
(`light`/`medium`/`heavy`, taps satisfactorios: fijar nota, etc.). El borrado con
confirm dispara `deleteFeedback` **desde `confirmAsync`** (`src/lib/confirm.ts`), así
todos los deletes con confirmación (tareas/rutinas/ideas/proyectos) lo heredan en un
solo punto; los borrados directos sin confirm (nota/sección en el editor) lo llaman
en su `onPress`.

## Datos en vivo (sin cerrar la app)

Espejo de la "frescura" de la web (`continuity/frontend/CLAUDE.md`). Vive en
`src/hooks/useLiveSync.ts`, montado una vez en `RootNavigator` (`src/app/_layout.tsx`).

- **Señales en vivo:** un trigger en Postgres (`notify_user_change`, backend
  `core/migrations/0036_live_change_signals.py` + `notifications/migrations/0015_live_settings_signal.py`)
  manda un broadcast al canal privado `user:<uuid>` cada vez que cambia una fila del usuario,
  venga de donde venga (web, Claude por MCP, syncs, jobs o esta app). El hook escucha y hace
  `refetchQueries({ include: "active" })` con debounce de 400 ms. El aviso solo trae
  `{table, op}`: los datos siguen saliendo por GraphQL.
- **Al volver a primer plano:** iOS suspende el socket en segundo plano, así que al regresar se
  relanzan las queries activas (mínimo 15 s entre llamadas).
- **Tema, paleta e idioma:** `ThemeProvider` **no** aplica desde el caché reactivo (para no pisar
  un cambio local a medias). Se suscribe con `onLiveChange` y, si el aviso es de
  `notifications_notificationsettings`, hace su propio refetch + `applyServerSettings`, igual que
  al volver a primer plano.
- **Apagar:** `EXPO_PUBLIC_LIVE_UPDATES=off` quita el socket (queda el refetch al volver), pero
  necesita build u OTA nuevos. El apagado inmediato es en el servidor:
  `alter table … disable trigger …_live;` (ver `backend/CLAUDE.md`).

### OTA (`eas update`): solo si el binario tiene los mismos módulos nativos

`runtimeVersion` usa la política `appVersion`: un `eas update` llega a **todo** build de
producción con la misma versión (hoy 1.0.0), aunque sea de hace meses. Si desde ese build se
agregó un módulo nativo (p. ej. `expo-clipboard`, `react-native-purchases` o `expo-font` después del
build de junio de 2026), el JS nuevo lo pide, el binario no lo tiene y **la app se cierra al abrir**.
Antes de publicar: `git diff <commit del último build de producción> HEAD -- package.json app.json`
(el commit sale en `eas build:list --build-profile production`). Si hay dependencias nativas nuevas,
toca `eas build --profile production --auto-submit`, no OTA.

## Arranque sin flash + tema persistente

- **Splash hold:** `_layout.tsx` llama `SplashScreen.preventAutoHideAsync()` al cargar
  el módulo; `ThemeProvider` hace `SplashScreen.hideAsync()` cuando `hydrated`
  (AsyncStorage de tema/paleta leído) **y** el auth ya resolvió. Así el primer frame
  visible ya está en el tema correcto — sin el "blanco → todo aparece (en light)".
- **Tema no se revierte:** la pantalla *Appearance* (`(more)/appearance.tsx`) escribe
  el tema/paleta **también al backend** (`updateNotificationSettings`), no solo a
  AsyncStorage. El tema es propiedad del usuario en el servidor y `ThemeProvider` lo
  re-hidrata en launch/foreground; si solo se guardaba local, la hidratación del
  servidor re-aplicaba el valor viejo y **revertía** el cambio. `changeTheme`/
  `changePalette` aplican local primero (flip instantáneo) y espejean al backend
  (no-fatal). Mismo patrón que `changeLocale`.

## Tour del dashboard — data-driven

Diez pasos que **navegan a cada sección y recortan el velo sobre ella**
(`src/components/onboarding/tour/`). Reemplazó al `DashboardTour` viejo, que
eran cinco tarjetas con icono y sin foco.

**Para agregarle un paso no se toca ningún componente**: una entrada en
`tour/steps.ts` + `onboarding.tour.<key>.title/.body` en los dos `messages`. Las
filas del menú "Más" ya son señalables por su `key` (`more.<key>`), así que una
sección nueva nace en el tour sin wiring. Procedimiento y decisiones:
**`docs/onboarding-tour.md`**.

El recorte son **cuatro vistas de velo** con el token `scrim` (no hay
`box-shadow: 0 0 0 9999px` en RN) y la medición es `measureInWindow` sobre
anclas registradas — no layout estático: la TabBar cambia de alto con el
safe-area.

## Onboarding (5 pasos) + paso "Personalizar Today"

5 pasos: **tema+paleta · nombre** · avatar · plan · **personalizar Today**. El
tema va primero desde 2026-09-14 y lleva la bienvenida en su encabezado: se
elige cómo se ve antes de dar ningún dato. Los componentes y las claves i18n
**ya no llevan número** (`StepTheme`, `onboarding.theme.*`), justamente para que
reordenar no obligue a renombrar nada. El paso 4 avanza
al 5 (`onContinue`); el paso 5 (`components/onboarding/StepCustomize.tsx`)
completa y abre el editor del Today vía el pub/sub `requestCustomize` de
`src/lib/tour.ts` (lo consume `(dashboard)/today.tsx` al montar). La ruta de
personalizar hace `markTour(seen:false)` para que el `DashboardTour` no choque
con el editor. Espejo del cambio web. Detalle:
`docs/onboarding-paso5-personalizar-today.md`.

## Paletas de colores

Para editar las paletas (cambiar hex de una existente o agregar una nueva), consulta `docs/paletas-de-colores.md`. Resumen: aquí **no hay `globals.css`** — `src/palette/config.ts` (`PALETTE_ACCENTS`, del que se derivan las muestras) es la fuente de verdad, leída por `src/theme/ThemeProvider.tsx`. Mantén los hex idénticos a los del repo web (`continuity`) y **verifícalo con `npm run check-parity`**, que compara los dos juegos y falla si divergen.

Las paletas del rediseño son cinco (ocre · salvia · óxido · hielo · ciruela). Las once viejas siguen leyéndose vía `LEGACY_PALETTE_MAP`, pero ya no se pueden elegir.

## Reportar bug / Feedback (usuario → admin, one-way)

El usuario envía un reporte de bug que llega al **inbox de admin** (solo web). Canal de un solo sentido — **sin respuestas**. El admin portal queda fuera del móvil (regla 10), así que aquí solo existe el lado de **envío**.

- **Pantalla:** `src/app/(dashboard)/(more)/report-bug.tsx`, registrada como `Stack.Screen` en `(more)/_layout.tsx` y enlazada desde el menú "más" (`more.tsx`, icono `Bug`, `href:"/report-bug"`).
- **Selector de tema:** `src/components/ui/BugTopicSelect.tsx` — trigger + `BottomSheet` con búsqueda y opción de **texto libre** ("Usar «…»"). Sigue el patrón de `ProjectSelect`.
- **Fuente de verdad de temas:** `src/lib/bugTopics.ts` — **espejo exacto** de `continuity/frontend/src/lib/bugTopics.ts` (mismos `value` y orden). Etiquetas i18n `bugTopics.<value>`; textos en `reportBug.*` (`src/messages/{en,es}.json`). Recuerda ICU llave simple: `reportBug.useTyped` usa `{query}`.
- **Datos:** `SUBMIT_BUG_REPORT` en `src/lib/graphql/feedback.ts` (`platform:"app"`) + hook `src/hooks/useReportMutations.ts` (devuelve boolean, errores se muestran con `toast` en la pantalla). Backend: app `core/feedback`. (Nota: `src/lib/graphql.ts` se partió en `src/lib/graphql/<dominio>.ts` + barrel; el import `@/lib/graphql` sigue igual.)

## Quick Notes — cuaderno tipo Notion (bajo "More")

Notas con **secciones plegables** (toggles), **categorizables** y ligables a un proyecto o sueltas. Vive bajo el stack `(more)`, como Ideas. Espejo de la web (`continuity/frontend`); plan/wireframes: `../continuity/docs/quick-notes/PLAN.md`. Backend: app `core` (GraphQL Strawberry).

- **Pantallas** (registradas en `(more)/_layout.tsx`, enlazadas desde `more.tsx` con icono `NotebookPen`, `href:"/quick-notes"`):
  - Lista: `src/app/(dashboard)/(more)/quick-notes.tsx` — búsqueda, chips de filtro (Todas / categorías / Sueltas / Fijadas), cards con franja de color de categoría, pull-to-refresh, FAB.
  - Editor: `src/app/(dashboard)/(more)/quick-note.tsx` (`?id=`) — título, categoría en chips, proyecto vía `ProjectSelect`, secciones, fijar/borrar. El título se re-siembra por `useEffect` sobre `note?.id` (estable mientras escribes, no pisa ediciones). La lista de secciones es un **`DraggableFlatList`** (`react-native-draggable-flatlist`) envuelto en `GestureHandlerRootView`; título/categoría/proyecto van en `ListHeaderComponent` y "agregar sección" en `ListFooterComponent` (se pasan como **elementos JSX**, no componentes inline, para no remontar los `TextInput` al teclear).
- **Sección:** `src/components/notes/NoteSectionCard.tsx` — chevron a la izquierda (caja 36×44) que pliega y **persiste `collapsed`** por sección, guarda al perder foco, **reorden por arrastre con long-press sobre la cabecera** (el `DraggableFlatList` pasa `onDrag`/`isActive`). Dos acciones de 44 px: **copiar** (`expo-clipboard`, swap Copy→Check 1.5s) y **⋯**, que abre una hoja con Editar texto/Vista previa · Plegar/Desplegar · Mover arriba/abajo (`reorderSections`) · Borrar. Caret por `transform` inline (no className alternante — regla 4).
- **Markdown:** `src/components/notes/MarkdownText.tsx` — renderer **propio sin dependencias** (RN `Text`/`View`; encabezados, listas, **negrita**, *cursiva*, `código`, enlaces vía `Linking`). ⚠️ El JSDoc **no** debe contener `*/` (cierra el bloque).
- **Datos:** hooks `src/hooks/useQuickNotes.ts` (query lazy) y `useQuickNoteMutations.ts` (refetch `QUICK_NOTES_QUERY`, vía `@apollo/client/react`). Tipos `QuickNote`/`NoteSection` en `src/lib/types.ts`. Reusa `categoryChipColors`/`alpha` para colores (regla 5). i18n `views.quickNotes.*` (en/es, ICU llave simple).
- **Onboarding:** el `DashboardTour` (`src/components/onboarding/DashboardTour.tsx`) tiene un coachmark de Notes (`STEPS` → `key:"stepNotes"`, icono `NotebookPen`, i18n `onboarding.tour.stepNotes`). Los puntos de progreso/`next()` se ajustan solos al tamaño de `STEPS`. La nota de ejemplo para usuarios nuevos la siembra el backend (seed). No se tocó `TOTAL_STEPS`.

## Calendario — vistas Día/Semana/Mes

Pantalla `src/app/(dashboard)/(more)/calendar.tsx` (bajo "More"). Los sub-views y chips se comparten en `src/components/calendar/` y la lógica de fechas en `src/lib/calendar.ts`. **Espejo de la web** (`continuity/frontend`, mismos archivos), con dos adaptaciones al ancho del teléfono.

- **Cabecera** (`CalendarHeader.tsx`): fija fuera del scroll, compartida por las tres vistas (periodo 26/30, meta en versalitas, flechas 44, `Segmented` + filtros). Los datos salen de `hooks/useCalendarData.ts` (cubetas, resumen, barras y carga del Mes una vez por mes, ítems del día enfocado vía `components/calendar/entries.ts`).
- **Vista Día** (`DayGrid.tsx`): barra de carga de 6 px con "Light/Busy/Over"; ítems **sin hora** como filas (`CalendarItemRow`, espina del color de la categoría, rutinas en `accent`), más de 6 → 5 + "+N more"; la **rejilla horaria solo si hay eventos con hora** (60 px/hora, bloques `TimedBlock` con `minHeight` 48 que crecen si el título envuelve, columnas por solape con `layoutOverlaps` de `lib/calendar`); línea "ahora" en `signal` (`NowLine`, un solo intervalo de 60 s en la pantalla); "Add to Thursday" abre `task-form` con `due` = ese día. Vacío: "Nothing on Thursday." + el mismo botón.
- **Vista Mes** (`MonthGrid.tsx` + `MonthCell.tsx` memo + `MonthLegend.tsx`): celdas sin tarjeta de 60 px separadas por regla; hasta **3 barras** del color de categoría y "+N"; carga por **peso** (busy = número en 700) y **regla superior de 3 px `signal`** si está sobrecargado. **Un tap SELECCIONA** el día → su agenda (`DayAgenda.tsx`, regla 3 px `accent`, hasta 4 filas, "Open day →") se pinta **debajo**; tocar el **ya seleccionado** entra a la vista Día. O sea, **un tap ≠ navegar**.
- **Color de un ítem**: espina del bloque, barra de la celda y espina de la fila salen de `projectColor()` (`parts.tsx`, `categoryChipColors(...).dot`); sin categoría `line[34]`, rutinas `accent`.
- **Vista Semana** = `WeekAgenda.tsx`: filas rayadas por día (columna de 40 px con día en versalitas + número display de 22), ítems a 15 px con `TaskToggle` y meta a la derecha (horas, "late"); hoy lleva espina accent y barra de carga de 3 px; "Nothing scheduled" en días vacíos. No es `WeekGrid` de columnas como la web (adaptación al ancho). El titular es el periodo (`ScreenHeadline size={26}`) con "N tasks · N routines · Xh" (`components/calendar/summary.ts`); los toggles de tareas/carga viven en una hoja de filtros (tareas visibles por defecto).
- **Las rutinas NO se completan desde el calendario** (decisión de producto). Las filas y bloques de rutina **navegan a la edición** (`routine-form`) vía `handlers.onOpenRoutine`. `CalendarHandlers` **ya no tiene** `onCompleteOccurrence`/`onUncompleteOccurrence`. El estado "completada" se ve (tachado + opacidad) pero es de solo lectura.

## Filas de tarea/rutina + borrar en el detalle (no en la fila)

Rediseño de `TaskRow`/`RoutineRow` (`src/components/tasks|routines/`) por nota de diseñador — homologado con la web.

- **`TaskToggle` compartido** (`src/components/tasks/TaskToggle.tsx`) es el control de completar de toda fila de tarea/rutina: círculo de **28px** (vacío = "lléname"; 24 en la semana del calendario), se llena con accent + palomita al completar; **`signal`** si vencida, candado si bloqueada, **punteado + ↻** para rutina. Reemplazó al `CheckCircle2` de 18px que se leía como decoración.
- **Spine de urgencia** de 3px en el borde izquierdo (`signal` vencida / `accent` hoy / neutro) + **badges sólidos** "Vencida · Nd" / "Hoy" (i18n `taskRow.overdueDays`/`todayBadge`, **plural ICU**). Filas vencidas exponen **solo "Reprogramar"** (36 px): "Mover a hoy" se quitó en el rediseño Breathe (fila y Today's Focus). `TaskRow` acepta `onLongPress` y `dragHandle` (el ⠿ de 36×44 del detalle de proyecto).
- **Borrar NO vive en la fila** — se movió al **detalle de edición** para evitar el mis-tap junto al toggle. `ModalDeleteButton` (`src/components/ui/ModalDeleteButton.tsx`) usa **`confirmAsync`** (Alert nativo + haptic warning) al final de `task-form`/`routine-form`. Las filas conservan `onDelete?` **opcional sin usar** (con comentario) para no romper los ~call sites; el tap en la fila abre la edición. (En web el confirm es de dos pasos inline, no Alert.)
- **Today's Focus** (`src/components/today/TodayFocusSection.tsx`) es un **componente aparte** a propósito: lista cosas **mixtas** en una lista priorizada (tareas vencidas/hoy + **proyectos estancados** + **próximos pasos**), por eso no reusa `TaskRow`. Comparte el **lenguaje visual** (mismo `TaskToggle` + spine + badges), no el componente.

## Detalle de proyecto — cierre y "Launch"

`src/app/project/[id].tsx` ofrece acciones de status gateadas por el estado actual: **Launch** (Rocket, éxito) para active/idea/stalled → `closure.setStatus(project,"launched")` **sin modal de notas** (espejo del selector de status de la web); **Pause**/**Kill** con sus modales de notas; **Reactivate**/**Revive**. `useProjectClosure.setStatus` acepta `"active" | "idea" | "launched"`. Las etiquetas salen de `views.projectDetail.statusAction.*` (estaban hardcodeadas en inglés; el rediseño las pasó a i18n).

La cabecera de la pantalla la abre el **nombre del proyecto en display con espina**, no el chip de prioridad: el nombre solo vivía en el header de navegación, que lo trunca. A la derecha va la `CoolingRule` (días sin tocar, con escala) y debajo, si hay tareas abiertas con blocker, el `BlockerBadge` con **la razón** del primero — "bloqueado" no le dice a nadie qué hacer.

## Ocultar tareas de proyectos cerrados

Las tareas de un proyecto **paused/stalled/killed/archived** se retiran de las vistas diarias; las **standalone** y las de proyectos vivos se quedan. Filtro por `isDailyViewStatus(project.status)` (`src/lib/projectStatus.ts`) en **tres lugares**: Today (`useTodayFocus`), página de Tasks (`(dashboard)/tasks.tsx`, `visibleTasks`) y Calendario (`calendar.tsx`, `visibleTasks`). Gestiona esas tareas desde el detalle de proyecto / graveyard.

## Loop: tres asistentes, un solo interruptor

**No mires `plan` para decidir qué pintar.** `useAssistant()` expone `mode`, que viene del
backend en `GET /usage/` como `assistant_mode` (la regla vive en
`backend/core/assistant/tiers.py`). Espejo exacto de la web — si tocas uno, toca el otro.

- **`none`** (free) — `<AssistantLocked/>`: cartel con lo que Loop haría con sus datos y
  CTA a `/billing`. Sin compositor. **La entrada al asistente no se quita**: el cartel es
  el gancho, no un candado.
- **`canned`** (pro) — `<ActionMenu/>`: catálogo de consultas, **sin campo de texto libre**
  (salvo el buscador, etiquetado como tal). Cada botón llama a `POST /actions/<id>/`, que
  responde JSON ya renderizado por el servidor en el locale del usuario. No hay stream,
  no hay modelo, no hay cupo — por eso `<UsageMeter/>` no se pinta aquí.
  Las etiquetas y el idioma llegan del backend con el catálogo: **una consulta nueva no
  necesita release en la store.**
  **Aviso de Studio:** espejo de la web (`<StudioHint/>` + `actions.studioLine`), con una
  diferencia por la regla 10: el enlace dice "Ver mi plan" y abre `/billing` (solo lectura),
  y la línea fija del menú no lleva enlace. `assistant.hint.cta` está en la lista de
  divergencias permitidas de `check-i18n`.
- **`llm`** (studio/admin) — el chat de siempre: `streamChat`, `QuickActionChips`, medidor
  de cupo y compositor.

**El toggle de "modo profundo" ya no existe.** Qué modelo contesta lo decide el servidor
(switch de admin + cupo diario). No mandes `deep_mode` ni lo reintroduzcas: un botón que a
veces se honra y a veces se ignora en silencio es peor que no tener botón.

**`budget_exhausted` no es un error.** El stream lo emite y **sigue**: lo que llega después
es el cierre que escribe el modelo sin herramientas, diciendo qué alcanzó a hacer.

## Rediseño UX "Breathe" (2026-10)

Handoff de diseño aplicado a las 23 pantallas. Reglas que quedaron fijas:

- **Medidas en `SIZE`** (`src/theme/tokens.ts`): toque 44, chips de preset 40, chips de filtro 36, input 48 (52 en auth), botón 52, fila 56, gap de sección 24, gutter 20. No escribas un 42 suelto.
- **Primitivas** en `src/components/ui/`: `ScreenHeadline` (titular con la cifra: "18 open." / "2 overdue."), `SectionHeader` + `CollapsibleSection` (conteos en **segunda línea**, nunca en la del título; ya no hay variante "card"), `FilterChips`, `IconAction` (botón-icono 44, `label` obligatorio), `Segmented`, `PresetChips`, `RuledRow`, `FormScaffold` (reemplazó a `ModalScaffold`), `Field` (con `aside`), `DatePickerSheet`/`DateInput`.
- **Títulos nunca con `numberOfLines={1}`**: envuelven. Solo la meta secundaria elipsa.
- **Una tarjeta por fila** (sin card-en-card); listas como filas rayadas con espina de 3 px cuando hay estado.
- **Pestañas**: etiqueta 11 px (600 en la activa) y regla superior de 2 px en `accent` (`TabButton` en `(dashboard)/_layout.tsx`).
- **"Continue here"** en el detalle de proyecto crea una tarea desde el next step: `task-form` acepta `title` y `due: "today"` de prellenado (solo al crear).
- **Reset de contraseña**: el enlace del correo abre `continuity://auth/reset` → `src/app/auth/reset.tsx` (canje PKCE + `updateUser`). La Redirect URL tiene que estar permitida en Supabase. `src/lib/passwordRecovery.ts` evita que el guard saque al usuario de la pantalla.
- **Pruebas**: `npm test` (jest-expo + Testing Library; `jest.setup.js` mockea el tema con `global.__THEME__` para probar los tres). Cada primitiva verifica hit-area y `accessibilityLabel`. Código sin uso: `npm run knip` (línea base en `reports/knip-baseline.json`).
