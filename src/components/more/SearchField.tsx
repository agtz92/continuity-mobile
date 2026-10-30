import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Buscador de las listas de "More" (Ideas, Notes, Log): 48 px, fondo
 * `surface`, filete `line18`, lupa 18. Mismo alto que `FormInput`.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const c = useThemeColors();
  return (
    <View
      className="flex-row items-center rounded-lg"
      style={{
        height: SIZE.input,
        paddingHorizontal: 14,
        gap: 10,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line[18],
      }}
    >
      <Search size={18} color={c.text3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.text5}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        className="flex-1"
        style={{ color: c.text, fontSize: 16, height: SIZE.input }}
      />
    </View>
  );
}
