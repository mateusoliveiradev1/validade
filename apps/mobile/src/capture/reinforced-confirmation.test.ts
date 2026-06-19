import { describe, expect, it } from "vitest";
import { observationActions, reinforcedObservationActions } from "./capture-copy";

describe("reinforced observation outcomes", () => {
  it("keeps the six concrete outcomes and reinforces every consequential one", () => {
    expect(observationActions.map(([status]) => status)).toEqual([
      "present",
      "moved",
      "withdrawn",
      "loss",
      "not_found",
      "probably_sold_out",
    ]);
    expect(reinforcedObservationActions).toEqual([
      "withdrawn",
      "loss",
      "not_found",
      "probably_sold_out",
    ]);
  });
});
