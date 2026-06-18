import Svg, { Path } from "react-native-svg";
import type { LucideProps } from "lucide-react-native";

/**
 * Headstone / tombstone icon. lucide-react-native has no grave icon, so this
 * mirrors the lucide API (size/color/strokeWidth) for the Graveyard surfaces.
 * Skull stays for the killed-status badge / kill action.
 */
export function Tombstone({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
}: LucideProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M7 22V11a5 5 0 0 1 10 0v11" />
      <Path d="M5 22h14" />
      <Path d="M12 9v5" />
      <Path d="M9.5 11.5h5" />
    </Svg>
  );
}
