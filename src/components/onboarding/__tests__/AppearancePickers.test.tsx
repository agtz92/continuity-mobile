import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { PaletteSwatches, ThemeSwatches } from "@/components/onboarding/AppearancePickers";
import { QuickActionChips } from "@/components/assistant/QuickActionChips";
import { SIZE } from "@/theme/tokens";

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const THEMES = ["continuu", "light", "carbon"] as const;

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, number>;

const tall = (node: { props: { style?: unknown } }) => {
  const s = flat(node);
  return Math.max(s.height ?? 0, s.minHeight ?? 0);
};

describe.each(THEMES)("selectores de apariencia en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });

  it("ThemeSwatches: tres muestras de 84 + System ≥44, con etiqueta y estado", () => {
    const onChange = jest.fn();
    render(<ThemeSwatches value="light" onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    for (const r of radios) {
      expect(r.props.accessibilityLabel).toBeTruthy();
      expect(tall(r)).toBeGreaterThanOrEqual(SIZE.hit);
    }
    expect(tall(radios[0])).toBe(84);
    fireEvent.press(screen.getByLabelText("settings.appearance.themeCarbon"));
    expect(onChange).toHaveBeenCalledWith("carbon");
    // La activa no vuelve a disparar.
    fireEvent.press(screen.getByLabelText("settings.appearance.themeLight"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("PaletteSwatches: cinco celdas de 72 con etiqueta", () => {
    const onChange = jest.fn();
    render(<PaletteSwatches value="salvia" onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    for (const r of radios) {
      expect(r.props.accessibilityLabel).toBeTruthy();
      expect(tall(r)).toBe(72);
    }
    fireEvent.press(screen.getByLabelText("settings.appearance.paletteHielo"));
    expect(onChange).toHaveBeenCalledWith("hielo");
  });

  it("QuickActionChips: píldoras de 40 con etiqueta", () => {
    const onPick = jest.fn();
    render(<QuickActionChips onPick={onPick} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    for (const b of buttons) {
      expect(b.props.accessibilityLabel).toBeTruthy();
      expect(tall(b)).toBe(SIZE.chip);
    }
    fireEvent.press(buttons[0]);
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
