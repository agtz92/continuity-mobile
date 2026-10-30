import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pencil } from "lucide-react-native";

import { IdeaRow } from "@/components/more/IdeaRow";
import { SheetRow } from "@/components/more/SheetRow";
import type { Idea } from "@/lib/types";
import { SIZE } from "@/theme/tokens";

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, number>;

const idea: Idea = {
  id: "i1",
  title: "Newsletter",
  description: "",
  why: "Keep the community warm",
  created: new Date(Date.now() - 31 * 86400000).toISOString(),
};

describe.each(["continuu", "light", "carbon"] as const)("filas de More en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });

  it("IdeaRow: Promote de 40 px y ⋯ de 44 con etiqueta", () => {
    const onPromote = jest.fn();
    const onMore = jest.fn();
    render(<IdeaRow idea={idea} onPromote={onPromote} onMore={onMore} />);
    const promote = screen.getByLabelText("views.ideas.promote: Newsletter");
    expect(flat(promote).height).toBeGreaterThanOrEqual(SIZE.chip);
    fireEvent.press(promote);
    expect(onPromote).toHaveBeenCalledWith("i1");
    const more = screen.getByLabelText("views.ideas.moreActions");
    expect(flat(more).height).toBe(SIZE.hit);
    fireEvent.press(more);
    expect(onMore).toHaveBeenCalledWith(idea);
  });

  it("SheetRow: 46 px y etiqueta accesible", () => {
    const onPress = jest.fn();
    render(<SheetRow icon={Pencil} label="Edit" onPress={onPress} />);
    const row = screen.getByLabelText("Edit");
    expect(flat(row).minHeight).toBeGreaterThanOrEqual(46);
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
