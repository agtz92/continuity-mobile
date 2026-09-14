# El tour del dashboard — cómo agregarle pasos

> Para quien viene a añadir una sección nueva y no quiere leerse el motor.
> Si solo buscas **el procedimiento**, es la sección 2 y son tres archivos.

## 1. Qué es

Un recorrido de diez pasos que arranca solo la primera vez (`tourStatus ===
"pending"`) y se puede relanzar desde **Apariencia → ver el tour otra vez**.

Cada paso hace tres cosas: **navega** a la sección, **recorta** el velo sobre el
control que la abre, y **cuenta** qué es esa sección en dos frases.

El diseño se sostiene sobre una separación que conviene no romper:

| Archivo | Qué es | ¿Cambia al añadir una sección? |
|---|---|---|
| `tour/steps.ts` | el guion: qué pasos hay, en qué orden, a qué apuntan | **sí, una línea** |
| `src/messages/{en,es}.json` | los textos | **sí, dos claves** |
| `tour/DashboardTour.tsx` | el motor: navegar, medir, colocar, persistir | no |
| `tour/TourCard.tsx` | la ficha (numeral, espina, botones) | no |
| `tour/Spotlight.tsx` | el recorte de cuatro velos | no |
| `tour/anchors.ts` + `TourAnchor.tsx` | el registro de sitios señalables | no |

No hay contador de pasos que subir ni un `switch` con un caso por sección: el
numeral de la ficha, las marcas de progreso y el botón final salen todos de
`TOUR_STEPS.length`.

## 2. Agregar un paso

### Caso normal: la sección vive en el menú "Más"

Es el caso de casi todo lo que se añade. **No hay que tocar la pantalla**: las
filas de `more.tsx` se envuelven en bloque, así que la tuya ya es señalable con
el `key` que le pusiste al item.

1. **`src/components/onboarding/tour/steps.ts`** — una entrada, en el sitio que
   le toque por **orden visual de la lista de "Más"** (si el recorte salta
   hacia arriba y hacia abajo por la misma pantalla, se lee como un error):

   ```ts
   { key: "invoices", route: "/more", anchor: "more.invoices" },
   ```

   `anchor` es `"more." + el key del item` en `more.tsx`. Nada más.

2. **`src/messages/en.json` y `src/messages/es.json`** — dos claves bajo
   `onboarding.tour`, con el mismo nombre que el `key` del paso:

   ```json
   "invoices": {
     "title": "Facturas: lo que ya cobraste",
     "body": "…"
   }
   ```

   La resolución es por convención (`onboarding.tour.<key>.title` / `.body`), sin
   mapa intermedio: si falta un texto, se ve en la primera pasada.

3. Listo. No hay paso 3.

### Caso pestaña

Igual, pero el ancla es `tab.<nombre>` y la ruta es la de la pestaña:

```ts
{ key: "tasks", route: "/tasks", anchor: "tab.tasks" },
```

Las cinco pestañas ya están envueltas en `(dashboard)/_layout.tsx`.

### Caso cualquier otro sitio

Si lo que quieres señalar no es una pestaña ni una fila de "Más", envuélvelo:

```tsx
import { TourAnchor } from "@/components/onboarding/tour/TourAnchor";

<TourAnchor id="today.focus">
  <TodayFocusSection … />
</TourAnchor>
```

`TourAnchor` es una `View` transparente: no cambia el layout, solo existe para
poder medirse. Luego usas ese id en `steps.ts`.

**Si el sitio puede quedar bajo el pliegue**, el `ScrollView` que lo contiene
necesita una línea más, y el tour lo trae a la vista solo:

```tsx
const scroller = useTourScroller();   // de "@/components/onboarding/tour/anchors"
…
<ScrollView {...scroller}>
```

### Paso sin ancla

Sin `anchor` el paso es a pantalla completa: el velo cubre todo y la ficha va
centrada. Es lo que hacen `welcome` y `close`.

```ts
{ key: "welcome", route: "/today" },
```

## 3. Cosas que ya se decidieron (y por qué)

- **El saludo ocurre sobre Today**, no en una pantalla propia. Así la vista en
  la que el usuario ya está entra en el recorrido sin gastar un paso, y el tour
  empieza situando en vez de interrumpiendo.
- **`log` no tiene paso propio.** Es la única vista que se explica sola al
  verla; se menciona dentro del paso de analíticas.
- **Sin datos de ejemplo.** Los pasos de analíticas y cementerio se escriben
  asumiendo cero datos, y su texto admite el vacío. Inventarle "14 empezados, 5
  cerrados" a alguien que lleva dos minutos es enseñarle la app de otra persona.
- **Los estados de proyecto del texto son los reales**: idea, activo, en pausa,
  lanzado, muerto. `stalled` y `archived` se omiten a propósito — el primero lo
  pone el servidor a los 14 días y el segundo no se puede elegir todavía.
  Mencionar algo que el usuario no puede hacer es peor que callarlo.
- **La ficha usa `lift("float")`**, no la sombra dura del handoff: es la única
  sombra con permiso en la app (AGENTS.md). Y su espina es una barra dibujada,
  no el primitivo `Spine` — aquel codifica **estado de proyecto** y no tiene un
  valor honesto que dar aquí.
- **Saltar no es perder.** `skip` persiste `seen: false` y saca un toast que
  dice dónde relanzarlo. `tour_status` distingue `seen` de `skipped`, así que el
  dato para decidir si el tour es demasiado largo se recoge solo.

## 4. Si algo no se recorta

El síntoma es siempre el mismo: el velo cubre la pantalla entera y la ficha sale
centrada, como si el paso no tuviera ancla.

1. **El id no coincide.** El de `steps.ts` y el del `TourAnchor` son la misma
   cadena o no hay medición. Para las filas de "Más", es `"more." + key`.
2. **La pantalla no estaba montada.** El motor reintenta 14 veces, ~90 ms cada
   una, pero si `route` apunta a otro sitio del que muestra el ancla, no hay
   reintento que valga.
3. **Android fundió la vista.** `TourAnchor` ya pone `collapsable={false}`; si
   envolviste a mano, te falta eso.
