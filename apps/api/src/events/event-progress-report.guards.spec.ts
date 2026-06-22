import { parseEventLifecycleStatus } from "./event-lifecycle";

describe("progress report eligibility", () => {
  it("allows progress reports only for stopped events", () => {
    const statuses = ["active", "paused", "stopped", "suspended"] as const;
    const allowed = statuses.filter(
      (s) => parseEventLifecycleStatus(s) === "stopped"
    );
    expect(allowed).toEqual(["stopped"]);
  });
});
