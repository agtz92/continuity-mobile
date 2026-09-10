import { useFonts } from "expo-font";
import { InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
} from "@expo-google-fonts/schibsted-grotesk";

/**
 * Carga en runtime de las dos familias del rediseño.
 *
 * `app.json` ya las embebe con el plugin de `expo-font`, pero **el plugin no
 * garantiza el nombre**: en iOS la familia acaba llamándose por el PostScript
 * name del archivo (`SchibstedGrotesk-Regular`) y en Android por el nombre del
 * fichero. `useFonts` registra la clave que tú le des, idéntica en las dos
 * plataformas, y esa clave es la que declara `tailwind.config.js`. El plugin se
 * queda porque hace que estén disponibles en el primer frame nativo; esto
 * asegura que el nombre sea el que el código escribe.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    InstrumentSans_700Bold,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
  });
  // Un fallo de carga NO debe dejar la app en el splash para siempre: se cae a
  // la fuente del sistema, que es fea pero legible.
  return loaded || error != null;
}
