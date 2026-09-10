/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Escala subida a propósito para teléfono (el cuerpo de iOS ≈ 17px; los
      // valores por defecto de Tailwind son de escritorio y se leen pequeños).
      // **No se toca en el rediseño**: ya está calibrada.
      fontSize: {
        xs: ["13px", "18px"],
        sm: ["15px", "21px"],
        base: ["17px", "25px"],
        lg: ["19px", "28px"],
        xl: ["21px", "30px"],
      },
      fontFamily: {
        // Las dos familias del rediseño. `display` para titulares y cifras,
        // `sans` para todo lo demás. **No hay `mono`**: los metadatos son
        // versalitas de la misma grotesca.
        display: ["InstrumentSans_700Bold"],
        sans: ["SchibstedGrotesk_400Regular"],
        "sans-medium": ["SchibstedGrotesk_500Medium"],
        "sans-semibold": ["SchibstedGrotesk_600SemiBold"],
        "sans-bold": ["SchibstedGrotesk_700Bold"],
      },
      colors: {
        // Las inyecta `ThemeProvider` con `vars()` de NativeWind. Los tres
        // temas fijan las superficies; la paleta activa pisa solo el acento.
        canvas: "var(--canvas)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        well: "var(--well)",

        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        "text-5": "var(--text-5)",
        "text-off": "var(--text-off)",

        accent: {
          DEFAULT: "var(--accent)",
          hi: "var(--accent-hi)",
          lo: "var(--accent-lo)",
        },

        // Semántica, no gusto: la paleta del usuario NO las pisa.
        signal: "var(--signal)",
        closed: "var(--closed)",

        "toast-bg": "var(--toast-bg)",
        "toast-text": "var(--toast-text)",

        // La rampa de reglas. Se emite ya resuelta desde el provider porque en
        // RN no hay `color-mix` y `border-line-14/50` no aplicaría sobre un
        // `var()` con hex dentro (regla 5 de AGENTS.md).
        line: {
          4: "var(--line-4)",
          8: "var(--line-8)",
          10: "var(--line-10)",
          14: "var(--line-14)",
          18: "var(--line-18)",
          22: "var(--line-22)",
          34: "var(--line-34)",
        },

        // --- Alias de compatibilidad. Mueren en la PR de limpieza. ---
        border: "var(--border)",
        "text-muted": "var(--text-muted)",
        "accent-2": "var(--accent-2)",
      },
      borderRadius: {
        // Tres radios y no más: control, fila, hoja.
        md: "6px",
        lg: "10px",
        xl: "14px",
      },
    },
  },
  plugins: [],
};
