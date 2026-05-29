import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Themed text input for modal forms. Wraps RN TextInput with the surface/border
 * styling and theme-resolved text + placeholder colors (className can't express
 * the placeholder color or reliable text color over theme vars).
 */
export const FormInput = forwardRef<TextInput, TextInputProps>(
  ({ multiline, style, ...props }, ref) => {
    const c = useThemeColors();
    return (
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={c.textMuted}
        className={
          "rounded-lg border border-border bg-surface px-3 py-2.5 text-base " +
          (multiline ? "min-h-20" : "")
        }
        style={[
          { color: c.text },
          multiline ? { textAlignVertical: "top" } : null,
          style,
        ]}
        {...props}
      />
    );
  }
);

FormInput.displayName = "FormInput";
