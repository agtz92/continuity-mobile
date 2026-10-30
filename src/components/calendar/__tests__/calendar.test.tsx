import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { DayGrid } from "@/components/calendar/DayGrid";
import { MonthCell } from "@/components/calendar/MonthCell";
import { TimedBlock } from "@/components/calendar/TimedBlock";
import type { TimedEntry } from "@/components/calendar/entries";
import { layoutOverlaps, type DayLoad } from "@/lib/calendar";
import { THEME_SURFACES } from "@/theme/tokens";
import type { ThemeColors } from "@/theme/useThemeColors";

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const THEMES = ["continuu", "light", "carbon"] as const;

/** Colores del tema sin pasar por el hook (las celdas los reciben por prop). */
const colorsFor = (theme: (typeof THEMES)[number]) => {
  const s = THEME_SURFACES[theme];
  return {
    ...s,
    accent: "green",
    accentHi: "green",
    accentLo: "green",
    line: { 4: "a", 8: "b", 10: "c", 14: "d", 18: "e", 22: "f", 34: "g" },
  } as unknown as ThemeColors;
};

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

const handlers = {
  onOpenProject: jest.fn(),
  onOpenTask: jest.fn(),
  onToggleTask: jest.fn(),
  onOpenRoutine: jest.fn(),
};

const block = (over: Partial<TimedEntry> = {}): TimedEntry => ({
  key: "b1",
  kind: "task",
  title: "Modo offline: cola de cambios y reintento al volver la red",
  start: 11 * 60,
  minutes: 30,
  spine: "gold",
  meta: "11:00 · ½h · Continuity",
  completed: false,
  ...over,
});

const calm: DayLoad = { hours: 0, unestimated: 0, level: "calm" };

describe.each(THEMES)("calendario en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });
  const c = colorsFor(theme);

  it("MonthCell: hoy, seleccionado y +N con 5 ítems", () => {
    render(
      <MonthCell
        iso="2026-10-29"
        day={29}
        inMonth
        isToday
        selected
        level="busy"
        bars={["a", "b", "c", "d", "e"]}
        colors={c}
        onPick={jest.fn()}
        accessibilityLabel="Thursday 29"
      />,
    );
    const cell = screen.getByLabelText("Thursday 29");
    expect(cell.props.accessibilityState).toEqual({ selected: true });
    expect(flat(cell).height).toBeGreaterThanOrEqual(44);
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("MonthCell: sobrecargado lleva regla superior de 3 px en signal", () => {
    render(
      <MonthCell
        iso="2026-10-08"
        day={8}
        inMonth
        isToday={false}
        selected={false}
        level="over"
        bars={["a"]}
        colors={c}
        onPick={jest.fn()}
        accessibilityLabel="d8"
      />,
    );
    const style = flat(screen.getByLabelText("d8"));
    expect(style.borderTopWidth).toBe(3);
    expect(style.borderTopColor).toBe(c.signal);
  });

  it("MonthCell: fuera de mes sin barras y sin opacidad", () => {
    render(
      <MonthCell
        iso="2026-09-28"
        day={28}
        inMonth={false}
        isToday={false}
        selected={false}
        level="over"
        bars={["a", "b"]}
        colors={c}
        onPick={jest.fn()}
        accessibilityLabel="d28"
      />,
    );
    const style = flat(screen.getByLabelText("d28"));
    expect(style.opacity).toBeUndefined();
    expect(style.borderTopWidth).toBe(1);
    expect(screen.queryByText(/\+/)).toBeNull();
  });

  it("TimedBlock: título a 2 líneas, meta a 1 y minHeight ≥ 48", () => {
    render(<TimedBlock entry={block()} top={0} left="0%" width="100%" colors={c} onPress={jest.fn()} />);
    expect(screen.getByText(block().title).props.numberOfLines).toBe(2);
    expect(screen.getByText(block().meta).props.numberOfLines).toBe(1);
    const btn = screen.getByRole("button");
    expect(flat(btn).minHeight).toBe(48);
    expect(flat(btn).height).toBeUndefined();
  });

  it("DayGrid: línea 'now' solo hoy y dentro del rango", () => {
    const props = {
      allDay: [],
      timed: [block()],
      nowMinutes: 14 * 60 + 37,
      dayName: "Thursday",
      load: calm,
      showLoad: false,
      locale: "en",
      colors: c,
      handlers,
      onAdd: jest.fn(),
    };
    const { rerender } = render(<DayGrid {...props} isToday />);
    expect(screen.getByText("views.calendar.now 2:37")).toBeTruthy();
    rerender(<DayGrid {...props} isToday={false} />);
    expect(screen.queryByText(/views.calendar.now/)).toBeNull();
  });

  it("DayGrid vacío: titular y botón para agregar", () => {
    render(
      <DayGrid
        allDay={[]}
        timed={[]}
        isToday
        nowMinutes={0}
        dayName="Thursday"
        load={calm}
        showLoad
        locale="en"
        colors={c}
        handlers={handlers}
        onAdd={jest.fn()}
      />,
    );
    expect(screen.getByText("views.calendar.nothingOn")).toBeTruthy();
    expect(flat(screen.getByRole("button")).height).toBe(48);
  });
});

describe("layoutOverlaps", () => {
  it("reparte en columnas solo lo que se pisa", () => {
    const out = layoutOverlaps([
      { key: "a", start: 600, end: 720 },
      { key: "b", start: 660, end: 690 },
      { key: "c", start: 800, end: 860 },
    ]);
    expect(out.get("a")).toEqual({ col: 0, cols: 2 });
    expect(out.get("b")).toEqual({ col: 1, cols: 2 });
    expect(out.get("c")).toEqual({ col: 0, cols: 1 });
  });
});
