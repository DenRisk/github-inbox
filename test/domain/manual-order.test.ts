import { arrangeByOrder, moveKey } from "../../src/domain/manual-order";

const byName = (name: string) => name;

describe("arrangeByOrder", () => {
  it("keeps the given order without a stored one", () => {
    expect(arrangeByOrder(["a", "b", "c"], byName, [])).toEqual(["a", "b", "c"]);
  });

  it("follows the stored order", () => {
    expect(arrangeByOrder(["a", "b", "c"], byName, ["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });

  it("puts new entries on top in their given order", () => {
    expect(arrangeByOrder(["a", "b", "new-1", "c", "new-2"], byName, ["c", "a", "b"])).toEqual(["new-1", "new-2", "c", "a", "b"]);
  });

  it("ignores stored entries that are gone", () => {
    expect(arrangeByOrder(["a", "b"], byName, ["gone", "b", "a"])).toEqual(["b", "a"]);
  });
});

describe("moveKey", () => {
  it("moves an entry before another one", () => {
    expect(moveKey(["a", "b", "c", "d"], "d", "b", false)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an entry after another one", () => {
    expect(moveKey(["a", "b", "c", "d"], "a", "c", true)).toEqual(["b", "c", "a", "d"]);
  });

  it("leaves the order alone when an entry is dropped on itself", () => {
    expect(moveKey(["a", "b", "c"], "b", "b", true)).toEqual(["a", "b", "c"]);
  });
});
