import { ActivityIndicator, View } from "react-native";

// Splash shown until the auth gate (root _layout) redirects to /login or /today.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator size="large" />
    </View>
  );
}
