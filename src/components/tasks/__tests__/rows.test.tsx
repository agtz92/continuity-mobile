import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { TaskRow } from "@/components/tasks/TaskRow";
import { RoutineRow } from "@/components/routines/RoutineRow";
import { toLocalISO } from "@/lib/date";
import type { Routine, Task } from "@/lib/types";
import { SIZE } from "@/theme/tokens";

// El diálogo de "cerrar bloqueada" arrastra Apollo/Supabase; aquí no hace falta.
jest.mock("@/components/tasks/BlockedTaskDialog", () => ({
  BlockedTaskDialog: () => null,
}));

declare global {
  // eslint-disable-next-line no-var
  var __THEME__: "continuu" | "light" | "carbon";
}

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, number>;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Revisar/aceptar DPAs con proveedores",
  projectId: null,
  dueDate: daysAgo(3).toISOString(),
  done: false,
  completedAt: null,
  created: daysAgo(10).toISOString(),
  effortHours: 1,
  dueTime: null,
  durationMinutes: null,
  blockers: [],
  ...over,
});

const routine = {
  id: "r1",
  title: "Enviar facturas",
  description: "",
  recurrenceType: "monthly_day",
  startDate: "2026-01-27",
  endDate: null,
  weekdays: [],
  intervalN: null,
  intervalUnit: null,
  monthlyDay: 27,
  effortHours: null,
  projectId: null,
  archived: false,
} as unknown as Routine;

describe.each(["continuu", "light", "carbon"] as const)("filas en tema %s", (theme) => {
  beforeEach(() => {
    global.__THEME__ = theme;
  });

  it("TaskRow vencida: solo Reschedule (36), sin Move to today, título sin cortar", () => {
    const onEdit = jest.fn();
    render(
      <TaskRow task={task()} project={undefined} onToggle={jest.fn()} onEdit={onEdit} />
    );
    expect(screen.queryByText("taskRow.moveToToday")).toBeNull();
    const reschedule = screen.getByLabelText("taskRow.reschedule");
    expect(flat(reschedule).height).toBe(36);
    fireEvent.press(reschedule);
    expect(onEdit).toHaveBeenCalled();
    expect(
      screen.getByText("Revisar/aceptar DPAs con proveedores").props.numberOfLines
    ).toBeUndefined();
    expect(screen.getByLabelText("taskRow.markDone")).toBeTruthy();
  });

  it("RoutineRow: editar y archivar como IconAction de 44 con etiqueta", () => {
    render(
      <RoutineRow
        routine={routine}
        scheduledDate={toLocalISO(daysAgo(2))}
        occurrenceId={null}
        onComplete={jest.fn()}
        onUncomplete={jest.fn()}
        onEdit={jest.fn()}
        onArchive={jest.fn()}
      />
    );
    for (const label of ["routineRow.editAria", "routineRow.archiveAria"]) {
      const b = screen.getByLabelText(label);
      expect(flat(b).width).toBeGreaterThanOrEqual(SIZE.hit);
      expect(flat(b).height).toBeGreaterThanOrEqual(SIZE.hit);
    }
  });
});
