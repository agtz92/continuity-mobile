import { useEffect, useRef } from "react";
import { Animated, Easing, View, type DimensionValue } from "react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Loading skeletons — placeholder shapes that mirror each screen's real
 * content so the first data load reads as "building" instead of an
 * empty-then-populate flash. Gate on `initialLoading` (first fetch, no data).
 *
 * `Skeleton` is the animated primitive (a theme-tinted box that pulses); the
 * screen compositions below stack it into rows/cards. The pulse uses RN's
 * built-in Animated (native-driven opacity) — no reanimated worklet needed.
 */
export function Skeleton({
  w = "100%",
  h = 12,
  r = 6,
}: {
  w?: DimensionValue;
  h?: number;
  r?: number;
}) {
  const c = useThemeColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: c.border,
        opacity,
      }}
    />
  );
}

function RowCard({ variant }: { variant: "row" | "card" }) {
  const c = useThemeColors();
  return (
    <View
      className="rounded-lg border p-3"
      style={{ borderColor: c.border, backgroundColor: c.surface }}
    >
      <View className="flex-row items-center gap-3">
        <Skeleton w={24} h={24} r={12} />
        <View className="flex-1 gap-2">
          <Skeleton w="65%" h={14} />
          <Skeleton w="40%" h={10} />
        </View>
      </View>
      {variant === "card" && (
        <View className="mt-3 flex-row gap-2">
          <Skeleton w={56} h={18} r={9} />
          <Skeleton w={72} h={18} r={9} />
        </View>
      )}
    </View>
  );
}

/** Generic list of placeholder rows/cards (Tasks, Routines, Ideas, Log, Notes,
 *  Projects, Calendar agenda). `variant="card"` adds a chip row. */
export function ListSkeleton({
  count = 6,
  variant = "row",
}: {
  count?: number;
  variant?: "row" | "card";
}) {
  return (
    <View className="flex-1 gap-3 px-5 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <RowCard key={i} variant={variant} />
      ))}
    </View>
  );
}

/** Matches Today: greeting, a counters strip, and the "focus" section with a
 *  couple of spine-accented cards. */
export function TodaySkeleton() {
  const c = useThemeColors();
  return (
    <View className="flex-1 gap-6 px-5 pt-1">
      <View className="gap-2">
        <Skeleton w="55%" h={22} />
        <Skeleton w="32%" h={12} />
      </View>

      <View className="flex-row gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            className="flex-1 items-center gap-2 rounded-xl border p-3"
            style={{ borderColor: c.border, backgroundColor: c.surface }}
          >
            <Skeleton w={28} h={20} />
            <Skeleton w="70%" h={10} />
          </View>
        ))}
      </View>

      <View className="gap-3">
        <Skeleton w={150} h={16} />
        {Array.from({ length: 2 }).map((_, i) => (
          <View
            key={i}
            className="flex-row gap-3 rounded-xl border border-l-[3px] p-4"
            style={{ borderColor: c.border, backgroundColor: c.surface }}
          >
            <Skeleton w={24} h={24} r={12} />
            <View className="flex-1 gap-2">
              <Skeleton w="45%" h={10} />
              <Skeleton w="80%" h={14} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
