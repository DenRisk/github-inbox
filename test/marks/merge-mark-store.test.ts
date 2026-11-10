import { MergeMarkStore } from "../../src/marks/merge-mark-store";
import { createMemoryStore } from "../../src/storage/key-value-store";

describe("MergeMarkStore", () => {
  it("knows no marks at first", async () => {
    expect(await new MergeMarkStore(createMemoryStore()).all()).toEqual([]);
  });

  it("remembers the marked items", async () => {
    const marks = new MergeMarkStore(createMemoryStore());
    await marks.set("I_1", true);
    await marks.set("I_2", true);
    await marks.set("I_1", true);
    expect(await marks.all()).toEqual(["I_1", "I_2"]);
  });

  it("forgets a mark that is taken back", async () => {
    const marks = new MergeMarkStore(createMemoryStore());
    await marks.set("I_1", true);
    await marks.set("I_2", true);
    await marks.set("I_1", false);
    expect(await marks.all()).toEqual(["I_2"]);
  });
});
