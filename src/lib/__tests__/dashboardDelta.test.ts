jest.mock("@/lib/apollo", () => ({ apolloClient: {} }));

import { deltaSince, isDeltaSafe, mergeDelta } from "@/lib/dashboardDelta";

describe("isDeltaSafe", () => {
  it("acepta el eco típico de palomear una tarea", () => {
    expect(
      isDeltaSafe([
        { table: "core_task", op: "UPDATE" },
        { table: "core_project", op: "UPDATE" },
        { table: "core_activity", op: "INSERT" },
      ])
    ).toBe(true);
  });

  it("rechaza borrados (cascadas) salvo de activities", () => {
    expect(isDeltaSafe([{ table: "core_task", op: "DELETE" }])).toBe(false);
    expect(isDeltaSafe([{ table: "core_activity", op: "DELETE" }])).toBe(true);
  });

  it("rechaza blockers: completar una tarea desbloquea otras", () => {
    expect(
      isDeltaSafe([
        { table: "core_task", op: "UPDATE" },
        { table: "core_taskblocker", op: "DELETE" },
      ])
    ).toBe(false);
  });

  it("rechaza tablas fuera de la cola, avisos sin op y lotes vacíos", () => {
    expect(isDeltaSafe([{ table: "core_category", op: "INSERT" }])).toBe(false);
    expect(isDeltaSafe([{ table: "notifications_notificationsettings" }])).toBe(false);
    expect(isDeltaSafe([{ table: "core_task" }])).toBe(false);
    expect(isDeltaSafe([])).toBe(false);
  });
});

describe("deltaSince", () => {
  it("parte de la activity más nueva menos el margen", () => {
    const since = deltaSince([
      { created: "2026-11-06T10:00:00.000Z" },
      { created: "2026-11-06T12:00:00.000Z" },
    ]);
    expect(since).toBe("2026-11-06T11:55:00.000Z");
  });

  it("sin activities usa la última hora", () => {
    const now = Date.parse("2026-11-06T12:00:00.000Z");
    expect(deltaSince([], now)).toBe("2026-11-06T11:00:00.000Z");
  });
});

describe("mergeDelta", () => {
  const prev = {
    dashboard: {
      projects: [{ id: "p1", name: "viejo" }],
      activities: [{ id: "a1" }],
      tasks: [{ id: "t1" }],
    },
  };

  it("reemplaza proyectos, agrega activities nuevas y deja lo demás", () => {
    const out = mergeDelta(prev, {
      projects: [{ id: "p1", name: "nuevo" }, { id: "p2" }],
      activities: [{ id: "a2" }, { id: "a1" }],
    });
    expect(out?.dashboard?.projects).toEqual([{ id: "p1", name: "nuevo" }, { id: "p2" }]);
    expect(out?.dashboard?.activities).toEqual([{ id: "a2" }, { id: "a1" }]);
    expect(out?.dashboard?.tasks).toBe(prev.dashboard.tasks);
  });

  it("sin dashboard cacheado no toca nada", () => {
    expect(mergeDelta(null, { projects: [], activities: [] })).toBeUndefined();
  });
});
