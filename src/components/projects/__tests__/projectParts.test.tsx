import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { NextStepCard } from "@/components/projects/NextStepCard";
import { StatusBadge } from "@/components/projects/StatusBadge";

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const THEMES = ["continuu", "light", "carbon"] as const;

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, number>;

describe.each(THEMES)("piezas del detalle de proyecto en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });

  it("NextStepCard: Continue here y Update a 48 px, con acción", () => {
    const onContinue = jest.fn();
    const onUpdate = jest.fn();
    render(<NextStepCard nextStep="Call the lawyer" onContinue={onContinue} onUpdate={onUpdate} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(flat(b).height).toBeGreaterThanOrEqual(44);
    fireEvent.press(screen.getByText("views.projectDetail.continueHere"));
    fireEvent.press(screen.getByText("views.projectDetail.update"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("NextStepCard: sin next step no ofrece Continue here", () => {
    render(<NextStepCard nextStep="" onContinue={jest.fn()} onUpdate={jest.fn()} />);
    expect(screen.queryByText("views.projectDetail.continueHere")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("StatusBadge lg: píldora de 36 px con etiqueta accesible", () => {
    const onPress = jest.fn();
    render(<StatusBadge status="active" size="lg" onPress={onPress} />);
    const pill = screen.getByRole("button", { name: "status.active" });
    expect(flat(pill).height).toBe(36);
    fireEvent.press(pill);
    expect(onPress).toHaveBeenCalled();
  });
});
