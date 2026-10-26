import { sortWorkItems } from "../../src/domain/sort-work-items";
import { item } from "../support/work-item";

describe("sortWorkItems", () => {
  it("puts items with a deadline first, earliest first, then the rest newest first", () => {
    const items = [
      item({ id: "old", createdAt: "2026-01-01T00:00:00Z" }),
      item({ id: "late", deadline: "2026-11-01" }),
      item({ id: "new", createdAt: "2026-10-01T00:00:00Z" }),
      item({ id: "soon", deadline: "2026-10-20" }),
    ];
    expect(sortWorkItems(items).map((i) => i.id)).toEqual(["soon", "late", "new", "old"]);
  });

  it("does not mutate its input", () => {
    const items = [item({ id: "b", deadline: "2026-12-01" }), item({ id: "a", deadline: "2026-10-01" })];
    sortWorkItems(items);
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
