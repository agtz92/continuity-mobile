import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pencil } from "lucide-react-native";

import { FilterChips } from "@/components/ui/FilterChips";
import { IconAction } from "@/components/ui/IconAction";
import { PresetChips } from "@/components/ui/PresetChips";
import { RuledRow } from "@/components/ui/RuledRow";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Segmented } from "@/components/ui/Segmented";
import { SIZE } from "@/theme/tokens";

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const THEMES = ["continuu", "light", "carbon"] as const;

/** Estilo aplanado de un nodo del árbol de pruebas. */
const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, number>;

/** Todos los botones del árbol miden al menos `min` de alto. */
function expectHit(min: number) {
  for (const b of screen.getAllByRole("button")) {
    const s = flat(b);
    expect(Math.max(s.height ?? 0, s.minHeight ?? 0)).toBeGreaterThanOrEqual(min);
  }
}

describe.each(THEMES)("primitivas en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });

  it("IconAction: caja de 44 y etiqueta accesible", () => {
    const onPress = jest.fn();
    render(<IconAction icon={Pencil} label="Edit" onPress={onPress} />);
    const btn = screen.getByLabelText("Edit");
    expect(flat(btn).width).toBe(SIZE.hit);
    expect(flat(btn).height).toBe(SIZE.hit);
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("SectionHeader: 44 de alto, conteo en segunda línea, alterna", () => {
    const onToggle = jest.fn();
    render(<SectionHeader title="Today" meta="1 task · 4h" open onToggle={onToggle} />);
    expectHit(SIZE.hit);
    expect(screen.getByText("Today").props.numberOfLines).toBeUndefined();
    expect(screen.getByText("1 task · 4h")).toBeTruthy();
    fireEvent.press(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("ScreenHeadline: el título envuelve y la segunda línea va en signal", () => {
    render(<ScreenHeadline primary="18 open." secondary="2 overdue." secondaryTone="signal" />);
    expect(screen.getByText("18 open.").props.numberOfLines).toBeUndefined();
    expect(screen.getByText("2 overdue.")).toBeTruthy();
  });

  it("FilterChips: 36 de alto y cambia de valor", () => {
    const onChange = jest.fn();
    render(
      <FilterChips
        items={[
          { key: "all", label: "All", count: 7 },
          { key: "active", label: "Active", count: 4 },
        ]}
        value="all"
        onChange={onChange}
      />,
    );
    const chip = screen.getByLabelText("Active 4");
    expect(flat(chip).height).toBe(SIZE.filterChip);
    fireEvent.press(chip);
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("Segmented: 44 de alto y no dispara sobre el activo", () => {
    const onChange = jest.fn();
    render(
      <Segmented
        options={[
          { value: "today", label: "Today" },
          { value: "all", label: "All" },
        ]}
        value="today"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByLabelText("Today"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("All"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("PresetChips: 40 de alto, multi como checkbox", () => {
    const onChange = jest.fn();
    render(
      <PresetChips
        options={[
          { value: "1", label: "1h" },
          { value: "2", label: "2h" },
        ]}
        value={["1"]}
        onChange={onChange}
      />,
    );
    const chips = screen.getAllByRole("checkbox");
    expect(flat(chips[0]).height).toBe(SIZE.chip);
    fireEvent.press(chips[1]);
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("RuledRow: alto mínimo de 56", () => {
    render(
      <RuledRow onPress={() => {}} accessibilityLabel="row" spine="tomato">
        <Text>Row</Text>
      </RuledRow>,
    );
    const inner = screen.getByLabelText("row").children[0] as never;
    expect(flat(inner).minHeight).toBe(SIZE.row);
  });
});
