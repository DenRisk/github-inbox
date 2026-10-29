import { badgeFor } from "../../src/sync/badge";
import { EMPTY_SNAPSHOT } from "../../src/sync/snapshot";
import { item } from "../support/work-item";

describe("badgeFor", () => {
  it.each(["no-token", "unauthorized", "insufficient-scopes", "sso-required"] as const)("shows ! for %s", (kind) => {
    expect(badgeFor({ ...EMPTY_SNAPSHOT, error: { kind, message: "x" } })).toEqual({ text: "!", color: "#d1242f" });
  });

  it("shows the number of reviews", () => {
    const reviews = [item({ id: "a", kind: "review" }), item({ id: "b", kind: "review" })];
    expect(badgeFor({ ...EMPTY_SNAPSHOT, reviews })).toEqual({ text: "2", color: "#6e56f0" });
  });

  it("shows nothing for zero reviews", () => {
    expect(badgeFor({ ...EMPTY_SNAPSHOT, tasks: [item()] }).text).toBe("");
  });

  it("keeps showing the cached count on a network error", () => {
    const snapshot = { ...EMPTY_SNAPSHOT, reviews: [item({ kind: "review" })], error: { kind: "network" as const, message: "x" } };
    expect(badgeFor(snapshot).text).toBe("1");
  });
});
