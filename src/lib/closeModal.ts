import type { useRouter } from "expo-router";

/**
 * Cierra un modal (formularios de `(modals)`, `ModalScaffold`).
 *
 * `router.back()` a secas falla con "GO_BACK was not handled" cuando el modal
 * es la única pantalla del historial: pasa si la app se recargó con el modal
 * abierto (Fast Refresh, o el dev client restaurando la ruta). Sin a dónde
 * volver, se va a Hoy en vez de dejar al usuario atrapado en el formulario.
 */
export function closeModal(router: ReturnType<typeof useRouter>): void {
  if (router.canGoBack()) router.back();
  else router.replace("/today");
}
