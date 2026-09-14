import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";

import { MARK_TOUR, ONBOARDING_STATE_QUERY } from "@/lib/graphql";
import { toast } from "@/lib/toast";
import { consumeTourRequest, subscribeTour } from "@/lib/tour";
import { useThemeVars } from "@/theme/ThemeProvider";
import { measureAnchor, tourScrollBy, type Rect } from "./anchors";
import { Spotlight, SPOTLIGHT_PAD } from "./Spotlight";
import { TourCard } from "./TourCard";
import { TOUR_STEPS } from "./steps";

/**
 * El tour del dashboard.
 *
 * Reemplaza a la versión anterior, que eran cinco tarjetas con un icono y
 * ninguna relación con la pantalla: describía "las tareas" sin enseñar dónde
 * están. Este **navega a cada sección y recorta el velo sobre ella**, que era
 * la petición.
 *
 * El archivo es el motor, no el contenido. Su trabajo es: llevar la app al
 * sitio del paso, medir el ancla, colocar la ficha donde no tape el hueco, y
 * persistir el resultado. Todo lo que cambia cuando el producto crece —
 * cuántos pasos hay, qué dicen, a qué apuntan— vive en `steps.ts` y en los
 * `messages/*.json`. Cómo añadir uno: `docs/onboarding-tour.md`.
 */

/** Aire entre el hueco y la ficha. */
const GAP = 16;
/** Alto supuesto de la ficha hasta que se mide sola. */
const CARD_H_GUESS = 250;
/** Reintentos de medición: la pantalla destino puede estar montándose. */
const TRIES = 14;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DashboardTour() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const themeVars = useThemeVars();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const { data } = useQuery<{ onboardingState: { tourStatus: string } | null }>(
    ONBOARDING_STATE_QUERY,
    { fetchPolicy: "cache-and-network" }
  );
  const tourStatus = data?.onboardingState?.tourStatus;
  const [markTour] = useMutation(MARK_TOUR);

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(CARD_H_GUESS);
  const autoStarted = useRef(false);
  // `pathname` cambia mientras el paso se resuelve; leerlo por ref evita que
  // el efecto de resolución se reinicie a media medición.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const start = useCallback(() => {
    setIndex(0);
    setRect(null);
    setActive(true);
  }, []);

  // Peticiones desde otra pantalla ("ver el tour otra vez", en Apariencia).
  // `consume` atrapa la bandera puesta antes de que esto montara.
  useEffect(() => {
    if (consumeTourRequest()) start();
    return subscribeTour(start);
  }, [start]);

  // Primera vez: arranca solo cuando el estado del servidor resuelve.
  useEffect(() => {
    if (tourStatus === "pending" && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
  }, [tourStatus, start]);

  // ── Resolver el paso: navegar, medir, desplazar si hace falta ─────────────
  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[index];
    if (!step) return;

    let cancelled = false;
    setRect(null);

    void (async () => {
      if (step.route && pathRef.current !== step.route) {
        router.navigate(step.route);
      }
      if (!step.anchor) return;

      for (let i = 0; i < TRIES && !cancelled; i++) {
        // La primera espera cubre la transición de pantalla; las demás son
        // para el caso de que la lista aún esté pintándose.
        await wait(i === 0 ? 280 : 90);
        if (cancelled) return;

        let r = await measureAnchor(step.anchor);
        if (!r) continue;

        // ¿Está bajo el pliegue? Se pide desplazamiento a quien tenga la
        // lista y se vuelve a medir. Si nadie escucha, se pinta donde esté.
        const topLimit = insets.top + 12;
        const bottomLimit = height - insets.bottom - 12;
        const over = r.y < topLimit ? r.y - topLimit - 24 : 0;
        const under = r.y + r.height > bottomLimit ? r.y + r.height - bottomLimit + 24 : 0;
        const dy = over || under;
        if (dy && tourScrollBy(dy)) {
          await wait(340);
          if (cancelled) return;
          r = (await measureAnchor(step.anchor)) ?? r;
        }

        if (!cancelled) setRect(r);
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, index, router, insets.top, insets.bottom, height]);

  const close = useCallback(() => {
    setActive(false);
    setIndex(0);
    setRect(null);
  }, []);

  const finish = useCallback(() => {
    void markTour({ variables: { seen: true } });
    close();
  }, [markTour, close]);

  const skip = useCallback(() => {
    void markTour({ variables: { seen: false } });
    close();
    // Saltar no es perder. Sin esto, el usuario que sale en el paso 2 no tiene
    // forma de saber que puede volver — y no va a ir a buscarlo a Apariencia.
    toast.info(t("onboarding.tour.skipped"));
  }, [markTour, close, t]);

  if (!active) return null;

  const step = TOUR_STEPS[index];
  if (!step) return null;

  // ── Colocación de la ficha ────────────────────────────────────────────────
  // Va del lado del hueco donde quepa. Sin hueco, centrada.
  const minTop = insets.top + 12;
  const maxTop = Math.max(minTop, height - insets.bottom - 12 - cardH);
  let top: number;
  if (!rect) {
    top = Math.max(minTop, (height - cardH) / 2);
  } else {
    const above = rect.y - SPOTLIGHT_PAD - GAP - cardH;
    const below = rect.y + rect.height + SPOTLIGHT_PAD + GAP;
    // Se prefiere arriba —el pulgar tapa la mitad de abajo de un teléfono—,
    // y se baja solo si arriba no cabe.
    top = above >= minTop ? above : Math.min(below, maxTop);
  }
  top = Math.min(Math.max(top, minTop), maxTop);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View style={[themeVars, { flex: 1 }]}>
        <Spotlight rect={rect} screen={{ width, height }} />
        <View style={{ position: "absolute", left: 16, right: 16, top }}>
          <TourCard
            index={index}
            total={TOUR_STEPS.length}
            title={t(`onboarding.tour.${step.key}.title`)}
            body={t(`onboarding.tour.${step.key}.body`)}
            onNext={() =>
              index < TOUR_STEPS.length - 1 ? setIndex((n) => n + 1) : finish()
            }
            onBack={index > 0 ? () => setIndex((n) => n - 1) : undefined}
            onSkip={skip}
            onLayout={setCardH}
          />
        </View>
      </View>
    </Modal>
  );
}
