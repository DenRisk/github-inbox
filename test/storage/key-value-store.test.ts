import { createMemoryStore, createWebStorageStore } from "../../src/storage/key-value-store";

describe("createMemoryStore", () => {
  it("returns undefined for a missing key", async () => {
    expect(await createMemoryStore().get("missing")).toBeUndefined();
  });

  it("returns what was set", async () => {
    const store = createMemoryStore();
    await store.set("answer", { value: 42 });
    expect(await store.get("answer")).toEqual({ value: 42 });
  });

  it("starts with the initial values", async () => {
    expect(await createMemoryStore({ a: 1 }).get("a")).toBe(1);
  });

  it("does not hand out its stored object for mutation", async () => {
    const store = createMemoryStore();
    await store.set("list", [1]);
    const list = await store.get<number[]>("list");
    list!.push(2);
    expect(await store.get("list")).toEqual([1]);
  });
});

describe("createWebStorageStore", () => {
  beforeEach(() => localStorage.clear());

  it("returns undefined for a missing key", async () => {
    expect(await createWebStorageStore(localStorage).get("missing")).toBeUndefined();
  });

  it("keeps values across store instances on the same storage", async () => {
    await createWebStorageStore(localStorage).set("answer", { value: 42 });
    expect(await createWebStorageStore(localStorage).get("answer")).toEqual({ value: 42 });
  });

  it("keeps its keys apart from other keys of the page", async () => {
    localStorage.setItem("answer", "not json");
    await createWebStorageStore(localStorage).set("answer", 1);
    expect(localStorage.getItem("answer")).toBe("not json");
    expect(await createWebStorageStore(localStorage).get("answer")).toBe(1);
  });
});
