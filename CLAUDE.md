@AGENTS.md

## Navegación — back button visible en el stack `(more)`

Todas las pantallas con header del stack `(more)` usan un **`headerLeft` compartido**
(`src/components/ui/HeaderBackButton.tsx`, flecha `ArrowLeft` temática) definido en
`(more)/_layout.tsx` con `headerBackVisible:false`. Motivo: el chevron nativo de iOS
era demasiado sutil (a veces solo la flecha, etiquetada con el título previo) y los
usuarios no notaban que el header era tocable. El botón se oculta solo cuando
`canGoBack === false`. Las pantallas presentadas como **modal** usan su propia **X**
(`ModalScaffold`); el chat usa una **X** propia en su header.

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

## Haptics (`src/lib/feedback.ts`)

Helpers guardados (import dinámico de `expo-haptics`, `default ?? mod` por interop):
`confirmCompleted` (success, completar tarea/rutina), `selectionFeedback` (toggles,
FAB, reordenar), `deleteFeedback` (patrón **Warning**, borrados) e `impactFeedback`
(`light`/`medium`/`heavy`, taps satisfactorios: fijar nota, etc.). El borrado con
confirm dispara `deleteFeedback` **desde `confirmAsync`** (`src/lib/confirm.ts`), así
todos los deletes con confirmación (tareas/rutinas/ideas/proyectos) lo heredan en un
solo punto; los borrados directos sin confirm (nota/sección en el editor) lo llaman
en su `onPress`.

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

## Onboarding (5 pasos) + paso "Personalizar Today"

5 pasos: nombre · tema · avatar · plan · **personalizar Today**. El paso 4 avanza
al 5 (`onContinue`); el paso 5 (`components/onboarding/Step5Customize.tsx`)
completa y abre el editor del Today vía el pub/sub `requestCustomize` de
`src/lib/tour.ts` (lo consume `(dashboard)/today.tsx` al montar). La ruta de
personalizar hace `markTour(seen:false)` para que el `DashboardTour` no choque
con el editor. Espejo del cambio web. Detalle:
`docs/onboarding-paso5-personalizar-today.md`.

## Paletas de colores

Para editar las paletas (cambiar hex de una existente o agregar una nueva), consulta `docs/paletas-de-colores.md`. Resumen: aquí **no hay `globals.css`** — `src/palette/config.ts` (`PALETTE_SWATCHES`) es la fuente de verdad, leída por `src/theme/ThemeProvider.tsx`. Mantén los hex idénticos a los del repo web (`continuity`).

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
- **Sección:** `src/components/notes/NoteSectionCard.tsx` — toggle plegable, guarda al perder foco, **reorden por arrastre** (handle ⠿ con `onLongPress={onDrag}`; el `DraggableFlatList` pasa `onDrag`/`isActive`), botón **copiar al portapapeles** (`expo-clipboard`, swap Copy→Check 1.5s) y **toggle vista/edición** (👁/✎). Las flechas ▲▼ se quitaron. Caret por `transform` inline (no className alternante — regla 4).
- **Markdown:** `src/components/notes/MarkdownText.tsx` — renderer **propio sin dependencias** (RN `Text`/`View`; encabezados, listas, **negrita**, *cursiva*, `código`, enlaces vía `Linking`). ⚠️ El JSDoc **no** debe contener `*/` (cierra el bloque).
- **Datos:** hooks `src/hooks/useQuickNotes.ts` (query lazy) y `useQuickNoteMutations.ts` (refetch `QUICK_NOTES_QUERY`, vía `@apollo/client/react`). Tipos `QuickNote`/`NoteSection` en `src/lib/types.ts`. Reusa `categoryChipColors`/`alpha` para colores (regla 5). i18n `views.quickNotes.*` (en/es, ICU llave simple).
- **Onboarding:** el `DashboardTour` (`src/components/onboarding/DashboardTour.tsx`) tiene un coachmark de Notes (`STEPS` → `key:"stepNotes"`, icono `NotebookPen`, i18n `onboarding.tour.stepNotes`). Los puntos de progreso/`next()` se ajustan solos al tamaño de `STEPS`. La nota de ejemplo para usuarios nuevos la siembra el backend (seed). No se tocó `TOTAL_STEPS`.

## Calendario — vistas Día/Semana/Mes

Pantalla `src/app/(dashboard)/(more)/calendar.tsx` (bajo "More"). Los sub-views y chips se comparten en `src/components/calendar/` y la lógica de fechas en `src/lib/calendar.ts`. **Espejo de la web** (`continuity/frontend`, mismos archivos), con dos adaptaciones al ancho del teléfono.

- **Vista Día** (`DayGrid.tsx`): invierte la jerarquía del espacio. Los items **sin hora** van en una **lista vertical legible** ("Todo el día · N", colapsa a partir de 4 con "Ver N más"), no en la tira de chips vieja. La **rejilla horaria solo se dibuja si hay eventos con hora** (`timedCount > 0`) — un día todo-all-day ya no deja la rejilla 7–21 vacía ocupando la pantalla. Sección "Con hora · N" aparte.
- **Vista Mes** (`MonthGrid.tsx`): cada celda muestra hasta **2 micro-barras con el color de categoría** de sus items (+N si hay más); la carga se movió del punto al **tinte del número del día** (ámbar/rojo). **Un tap SELECCIONA** el día → su agenda se renderiza **debajo** de la matriz (`SelectedDayAgenda.tsx`, con "Abrir día →"); tap en el día **ya seleccionado** (o "Abrir día") entra a la vista Día. O sea, **un tap ≠ navegar**. Al cambiar de mes la selección se reubica sola (hoy si es visible, si no el día 1).
- **Vista Semana** = `WeekAgenda.tsx` (lista vertical), no `WeekGrid` de columnas como la web (adaptación al ancho).
- **Chips** (`parts.tsx`, `ProjectChip`/`TaskChip`/`RoutineChip`) tienen prop **`size`**: `sm` (escala densa de celdas Semana/Mes) o `md` (renglón cómodo, usado por la lista del Día y el panel de agenda).
- **Las rutinas NO se completan desde el calendario** (decisión de producto). `RoutineChip` y el bloque de rutina con hora **navegan a la edición** (`routine-form`) vía `handlers.onOpenRoutine`. `CalendarHandlers` **ya no tiene** `onCompleteOccurrence`/`onUncompleteOccurrence`. El estado "completada" se ve (tachado + opacidad) pero es de solo lectura.

## Filas de tarea/rutina + borrar en el detalle (no en la fila)

Rediseño de `TaskRow`/`RoutineRow` (`src/components/tasks|routines/`) por nota de diseñador — homologado con la web.

- **`TaskToggle` compartido** (`src/components/tasks/TaskToggle.tsx`) es el control de completar de toda fila de tarea/rutina: círculo de **24px** (vacío = "lléname"), se llena con accent + palomita al completar; **rojo** si vencida, candado si bloqueada, **punteado + ↻** para rutina. Reemplazó al `CheckCircle2` de 18px que se leía como decoración.
- **Spine de urgencia** de 3px en el borde izquierdo (rojo vencida / ámbar hoy / neutro) + **badges sólidos** "Vencida · Nd" / "Hoy" (i18n `taskRow.overdueDays`/`todayBadge`, **plural ICU**). Filas vencidas exponen acciones rápidas **"Mover a hoy"** / **"Reprogramar"**.
- **Borrar NO vive en la fila** — se movió al **detalle de edición** para evitar el mis-tap junto al toggle. `ModalDeleteButton` (`src/components/ui/ModalDeleteButton.tsx`) usa **`confirmAsync`** (Alert nativo + haptic warning) al final de `task-form`/`routine-form`. Las filas conservan `onDelete?` **opcional sin usar** (con comentario) para no romper los ~call sites; el tap en la fila abre la edición. (En web el confirm es de dos pasos inline, no Alert.)
- **Today's Focus** (`src/components/today/TodayFocusSection.tsx`) es un **componente aparte** a propósito: lista cosas **mixtas** en una lista priorizada (tareas vencidas/hoy + **proyectos estancados** + **próximos pasos**), por eso no reusa `TaskRow`. Comparte el **lenguaje visual** (mismo `TaskToggle` + spine + badges), no el componente.

## Detalle de proyecto — cierre y "Launch"

`src/app/project/[id].tsx` ofrece acciones de status gateadas por el estado actual: **Launch** (Rocket, éxito) para active/idea/stalled → `closure.setStatus(project,"launched")` **sin modal de notas** (espejo del selector de status de la web); **Pause**/**Kill** con sus modales de notas; **Reactivate**/**Revive**. `useProjectClosure.setStatus` acepta `"active" | "idea" | "launched"`. ⚠️ Las etiquetas de estos botones están **hardcodeadas en inglés** (deuda pendiente de i18n, igual que sus vecinas).

## Ocultar tareas de proyectos cerrados

Las tareas de un proyecto **paused/stalled/killed/archived** se retiran de las vistas diarias; las **standalone** y las de proyectos vivos se quedan. Filtro por `isDailyViewStatus(project.status)` (`src/lib/projectStatus.ts`) en **tres lugares**: Today (`useTodayFocus`), página de Tasks (`(dashboard)/tasks.tsx`, `visibleTasks`) y Calendario (`calendar.tsx`, `visibleTasks`). Gestiona esas tareas desde el detalle de proyecto / graveyard.
