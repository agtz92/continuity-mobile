# Continuity Mobile — guía para agentes

App **React Native / Expo** (port de la web Continuity). Repo **separado** y **público**: `github.com/agtz92/continuity-mobile` (branch `master`). Consume el mismo backend GraphQL (`agtz92/continuity_backend`, otro repo — **no se toca**).

## Estado actual (2026-06-05)

- **Fases 0–7 + 9 completas** (auth, UI, hooks, 8 pantallas, modales CRUD, asistente IA, settings, onboarding + tour).
- **Fase 8 (push):** cliente listo y commiteado pero **gateado** (`PUSH_BACKEND_READY=false` en `src/lib/notifications.ts`) — falta backend.
- **Fase 10 (account deletion + polish):** pendiente, necesita endpoint backend (requisito Apple).
- **Fase 11:** **primer build en TestFlight ya subido.** Bundle id `it.continuu.app`. App Store Connect app id `6777210188`.

Plan completo y detalle por fase: `../continuity/docs/plan-desarrollo-app-movil.md` (repo web `continuity`, en `docs/`). Ese doc tiene el bloque "⭐ Estado actual" arriba.

## Reglas críticas (NO romper)

1. **Package manager: `npm`** (NO pnpm — pnpm es solo del frontend web). Instala deps con `npx expo install <pkg>`.
2. **Expo SDK 54** (Expo Go-compatible). NO subir de versión sin pedirlo.
3. **Verificar SIEMPRE en este orden:** `npx expo export -p ios --clear` (regenera typed routes) y LUEGO `npx tsc --noEmit`. Ambos deben salir exit 0.
4. **NativeWind v4 — trampa css-interop:** un `className` que alterne entre `undefined` y string **crashea Expo Go**. Usa strings estables siempre-concatenados, o maneja valores dinámicos por `style` inline (`style=undefined` sí es válido).
5. **Opacidad sobre colores del tema:** `bg-accent/<n>` NO aplica sobre los `var()` del tema. Usa `alpha(hex, n)` (de `@/theme/useThemeColors`) por `style` inline. Colores fijos de Tailwind (`text-red-500`, `bg-black/60`) sí funcionan.
6. **Modales `<Modal>`** renderizan en host tree separado y pierden las CSS vars del tema → re-inyectar con `useThemeVars()` en `style`. Backdrops oscuros: `rgba(0,0,0,0.x)` inline, NO `bg-black/60`.
7. **i18n = ICU (llave simple)** vía `i18next-icu`: `{count}`, `{count, plural, one {# x} other {# y}}`. **NUNCA** `{{count}}` (doble llave i18next — no interpola, se ve literal).
8. **Polyfills (`src/lib/polyfills.ts`) NO deben tocar `global.fetch`** (rompe el login de Supabase). El anon key de Supabase es publishable (seguro en cliente).
9. **OAuth (Supabase) requiere `flowType:"pkce"`** en `createClient` (ya está). Solo cierra el round-trip en dev build / standalone, NO en Expo Go.
10. **Apple/billing:** sin IAP en V1, billing **read-only**. NUNCA precios, plan cards ni "Suscribirme" in-app; solo link externo `Linking.openURL("https://continuu.it/settings/billing")`. El admin portal queda excluido del móvil.
11. **`.env.local`** tiene secretos y está gitignored — NO commitear. Solo `.env.example`.

## Iteración en device

Usa **development build** (recarga JS en vivo), NO re-buildees TestFlight por cada cambio:

```bash
eas device:create                 # registra el iPhone (1 vez; iOS 16+ pide "Developer Mode")
eas build --platform ios --profile development
npx expo start --dev-client
```

Dev build y TestFlight comparten bundle id → solo una instalada a la vez.

## Convenciones de tema/rutas

- `useThemeColors()` → `{bg,surface,border,text,textMuted,accent,accent2}` (hex). `alpha(hex,n)`.
- `useTheme()` → `{theme,palette,effective,setTheme,setPalette}`. `effective: "continuuit"|"light"|"dark"`.
- **Typed routes** activadas: estáticas como string (`router.push("/today")`), dinámicas como objeto (`router.push({pathname:"/project/[id]", params:{id}})`).

## Memoria del proyecto

Gotchas + decisiones acumuladas (para Claude Code): `C:\Users\alfre\.claude\projects\C--GitHub-continuity\memory\project_mobile_app.md`.
