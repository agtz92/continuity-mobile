import { doneEffortHours, doneTaskCount, totalTaskCount } from "@/lib/projectProgress";
import type { Task } from "@/lib/types";

const task = (done: boolean, effortHours: number | null = null) =>
  ({ id: Math.random().toString(), done, effortHours }) as unknown as Task;

describe("projectProgress", () => {
  const tasks = [task(true, 1), task(false, 2), task(true)];

  it("suma las completadas fuera de la ventana a las cacheadas", () => {
    const p = { olderDoneCount: 10, olderDoneEffortHours: 4.5 };
    expect(doneTaskCount(p, tasks)).toBe(12);
    expect(totalTaskCount(p, tasks)).toBe(13);
    expect(doneEffortHours(p, tasks)).toBe(5.5);
  });

  it("sin contador del servidor cuenta solo lo cacheado (clientes viejos)", () => {
    expect(doneTaskCount({}, tasks)).toBe(2);
    expect(totalTaskCount({}, tasks)).toBe(3);
    expect(doneEffortHours({}, tasks)).toBe(1);
  });
});
