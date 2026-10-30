/* eslint-env jest */
// Las primitivas leen el tema con `useTheme()`; en pruebas no hay
// ThemeProvider (que hidrata de AsyncStorage y del backend). `global.__THEME__`
// deja que cada prueba elija el modo para renderizar en los tres temas.
global.__THEME__ = "light";
jest.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: global.__THEME__,
    effective: global.__THEME__,
    palette: "salvia",
    setTheme: () => {},
    setPalette: () => {},
  }),
}));

jest.mock("@/lib/feedback", () => ({
  selectionFeedback: jest.fn(),
  confirmCompleted: jest.fn(),
  deleteFeedback: jest.fn(),
  impactFeedback: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "en" } }),
}));

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
