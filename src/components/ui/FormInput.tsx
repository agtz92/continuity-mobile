import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Input temático de formulario: 48 px de alto (52 en auth), radio 10, fondo
 * `surface` y borde `border` — **nunca** fondo `border`, que se leía como un
 * botón deshabilitado.
 */
export const FormInput = forwardRef<TextInput, TextInputProps & { auth?: boolean }>(
  ({ multiline, style, auth = false, ...props }, ref) => {
    const c = useThemeColors();
    return (
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={c.text5}
        // Sin `text-base`: su lineHeight (24) corta los descendentes (g/p/y) en
        // un TextInput de iOS. fontSize por style, sin lineHeight.
        className="rounded-lg border border-border bg-surface px-3.5"
        style={[
          { color: c.text, fontSize: 16 },
          multiline
            ? { minHeight: 96, paddingVertical: 12, textAlignVertical: "top" }
            : { height: auth ? SIZE.inputAuth : SIZE.input },
          style,
        ]}
        {...props}
      />
    );
  }
);

FormInput.displayName = "FormInput";
