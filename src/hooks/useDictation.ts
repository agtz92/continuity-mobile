/**
 * Dictado para el compositor de Loop: voz → texto con el reconocedor del
 * sistema (SFSpeechRecognizer en iOS, SpeechRecognizer en Android). El texto
 * cae en el campo; el usuario lo revisa y lo envía. Loop nunca recibe audio.
 *
 * `expo-speech-recognition` es un módulo NATIVO. Un binario hecho antes de
 * agregarlo (OTA sobre un build viejo, Expo Go) no lo trae y su import lanza
 * al cargar: por eso se requiere aquí dentro de un try y, si falta,
 * `available` queda en false y el botón no se pinta. Ver "OTA" en CLAUDE.md.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";
import { toast } from "@/lib/toast";
import { selectionFeedback } from "@/lib/feedback";

type SpeechModule = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;
type ResultEvent = import("expo-speech-recognition").ExpoSpeechRecognitionResultEvent;
type ErrorEvent = import("expo-speech-recognition").ExpoSpeechRecognitionErrorEvent;

let cached: SpeechModule | null | undefined;

function loadSpeech(): SpeechModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-speech-recognition").ExpoSpeechRecognitionModule as SpeechModule;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * BCP-47 para el reconocedor: el regional del sistema si es del mismo idioma
 * que la app **y** el reconocedor lo soporta; si no, el genérico. Sin esa
 * comprobación, un iPhone en inglés con región México daba `en-MX`, que Apple
 * no tiene para dictado ("language-not-supported").
 */
function recognizerLang(appLang: string, supported: string[]): string {
  const lang = appLang.startsWith("es") ? "es" : "en";
  const fallback = lang === "es" ? "es-MX" : "en-US";
  const norm = (x: string) => x.replace("_", "-").toLowerCase();
  const ok = (tag: string) =>
    supported.length === 0 || supported.some((s) => norm(s) === norm(tag));
  const candidates = [
    ...getLocales()
      .map((l) => l.languageTag)
      .filter((tag) => tag?.toLowerCase().startsWith(lang)),
    fallback,
  ];
  const pick = candidates.find(ok);
  if (pick) return pick;
  // El genérico no está en la lista: cualquier variante del idioma que sí esté.
  return supported.find((s) => norm(s).startsWith(`${lang}-`)) ?? fallback;
}

let supportedCache: string[] | null = null;
async function supportedLocales(speech: SpeechModule): Promise<string[]> {
  if (supportedCache) return supportedCache;
  try {
    const { locales } = await speech.getSupportedLocales({});
    supportedCache = locales ?? [];
  } catch {
    supportedCache = [];
  }
  return supportedCache;
}

/**
 * Solo iOS entrega resultados acumulados (cada final repite los anteriores);
 * Android manda cada segmento por separado. Recortar el prefijo en Android
 * borraría palabras cuando dos frases seguidas empiezan igual ("sí" → "sí, claro").
 */
const CUMULATIVE = Platform.OS === "ios";

function freshPart(prev: string, transcript: string): string {
  if (!CUMULATIVE || !prev || !transcript.startsWith(prev)) return transcript;
  return transcript.slice(prev.length).trim();
}

function join(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return /\s$/.test(a) ? a + b : `${a} ${b}`;
}

/** Errores que no son culpa de nadie: el usuario calló o canceló. */
const SILENT_ERRORS = new Set(["aborted", "no-speech", "speech-timeout"]);

/**
 * Tras el diálogo de permisos de iOS la app vuelve de "inactive": si el motor
 * de audio arranca antes de estar "active", falla en silencio y el primer
 * toque al micrófono no hace nada. Esperamos (con tope) a que regrese.
 */
function waitForActive(timeoutMs = 1500): Promise<void> {
  if (AppState.currentState === "active") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, timeoutMs);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") done();
    });
    function done() {
      clearTimeout(timer);
      sub.remove();
      resolve();
    }
  });
}

const QUICK_FAIL_MS = 1500;

export function useDictation(onText: (text: string) => void) {
  const { t, i18n } = useTranslation();
  const speech = loadSpeech();
  const [available] = useState(() => {
    try {
      return !!speech && speech.isRecognitionAvailable();
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);

  // Texto que había antes de empezar + segmentos ya finales de esta sesión.
  const committed = useRef("");
  // Último final de la sesión (ver `freshPart`: solo se usa en iOS).
  const lastFinal = useRef("");
  // Tras `cancel()` (p. ej. al enviar) un final rezagado no debe rellenar el campo.
  const ignoring = useRef(false);
  // Una sesión que muere en menos de QUICK_FAIL_MS sin oír nada no es que el
  // usuario se haya callado: iOS la rechazó (p. ej. 1110 "no-speech" al
  // instante). Antes se tragaba en silencio y el botón solo vibraba.
  const startedAt = useRef(0);
  const heardSomething = useRef(false);
  const lastError = useRef<string | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener("start", () => setListening(true)),
      speech.addListener("end", () => {
        setListening(false);
        const quick = Date.now() - startedAt.current < QUICK_FAIL_MS;
        const err = lastError.current;
        if (!quick || heardSomething.current || ignoring.current) return;
        // Los errores con aviso propio ya se mostraron en "error".
        if (err && !SILENT_ERRORS.has(err) && err !== "nomatch") return;
        toast.error(`${t("assistant.dictation.failed")} (${err ?? "end"})`);
      }),
      // iOS lo emite en lugar de "error" cuando no reconoce nada (203/Siri 1).
      speech.addListener("nomatch", () => {
        lastError.current = "nomatch";
      }),
      speech.addListener("result", (e: ResultEvent) => {
        const transcript = (e.results[0]?.transcript ?? "").trim();
        if (!transcript || ignoring.current) return;
        heardSomething.current = true;
        const tail = freshPart(lastFinal.current, transcript);
        if (e.isFinal) {
          lastFinal.current = transcript;
          committed.current = join(committed.current, tail);
          onTextRef.current(committed.current);
        } else {
          onTextRef.current(join(committed.current, tail));
        }
      }),
      speech.addListener("error", (e: ErrorEvent) => {
        setListening(false);
        if (__DEV__) console.warn("[dictation]", e.error, e.message);
        lastError.current = e.error;
        if (SILENT_ERRORS.has(e.error)) return;
        if (e.error === "not-allowed") {
          toast.error(t("assistant.dictation.denied"));
          return;
        }
        if (e.error === "language-not-supported") {
          toast.error(t("assistant.dictation.language"));
          return;
        }
        toast.error(`${t("assistant.dictation.failed")} (${e.error})`);
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      try {
        speech.abort();
      } catch {
        // ya estaba detenido
      }
    };
  }, [speech, t]);

  const start = useCallback(
    async (currentText: string) => {
      if (!speech) return;
      const before = await speech.getPermissionsAsync();
      const perm = before.granted ? before : await speech.requestPermissionsAsync();
      if (!perm.granted) {
        toast.error(t("assistant.dictation.denied"));
        if (!perm.canAskAgain) void Linking.openSettings();
        return;
      }
      // Recién concedido: el diálogo dejó la app en "inactive".
      if (!before.granted) await waitForActive();
      ignoring.current = false;
      heardSomething.current = false;
      lastError.current = null;
      startedAt.current = Date.now();
      committed.current = currentText.trimEnd();
      lastFinal.current = "";
      selectionFeedback();
      const supported = await supportedLocales(speech);
      speech.start({
        lang: recognizerLang(i18n.language || "en", supported),
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        // NO exigir reconocimiento en el equipo: si el idioma no está
        // descargado, iOS falla al instante con 1110 ("no-speech") y el botón
        // quedaba muerto. Sin exigirlo, iOS decide (local si puede, si no los
        // servidores de Apple), igual que Android.
        requiresOnDeviceRecognition: false,
        iosTaskHint: "dictation",
      });
    },
    [speech, i18n.language, t],
  );

  const stop = useCallback(() => {
    if (!speech) return;
    selectionFeedback();
    speech.stop();
  }, [speech]);

  /** Corta sin entregar nada más (el texto ya se envió o se descartó). */
  const cancel = useCallback(() => {
    if (!speech) return;
    ignoring.current = true;
    speech.abort();
  }, [speech]);

  return { available, listening, start, stop, cancel };
}
