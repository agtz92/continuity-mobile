import { ActivityIndicator, Platform, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTranslation } from "react-i18next";

import { AuthButton } from "@/components/auth/AuthParts";
import { useTheme } from "@/theme/ThemeProvider";
import { SIZE } from "@/theme/tokens";

/**
 * "Continuar con Apple". En iOS es el botón nativo de Apple (App Review pide
 * que siga sus guías de marca y el nativo las cumple solo, incluido el idioma);
 * blanco sobre los temas oscuros y negro sobre el claro. En Android, que no
 * tiene botón nativo, es un `AuthButton` secundario como el de Google.
 */
export function AppleSignInButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const { effective } = useTheme();

  if (Platform.OS !== "ios") {
    return (
      <AuthButton variant="secondary" label={t("auth.login.apple")} onPress={onPress} busy={busy} />
    );
  }

  return (
    <View style={{ height: SIZE.button, opacity: busy ? 0.6 : 1 }} pointerEvents={busy ? "none" : "auto"}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          effective === "light"
            ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
        }
        cornerRadius={8}
        style={{ width: "100%", height: SIZE.button }}
        onPress={onPress}
      />
      {busy ? (
        <View
          style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="small" />
        </View>
      ) : null}
    </View>
  );
}
