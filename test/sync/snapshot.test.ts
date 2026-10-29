import { createMemoryStore } from "../../src/storage/key-value-store";
import { EMPTY_SNAPSHOT, loadSnapshot, SNAPSHOT_KEY } from "../../src/sync/snapshot";
import { item } from "../support/work-item";

describe("loadSnapshot", () => {
  it("starts empty without a stored snapshot", async () => {
    expect(await loadSnapshot(createMemoryStore())).toEqual(EMPTY_SNAPSHOT);
  });

  it("gives items stored before pull requests were fetched an empty list", async () => {
    const { pullRequests: _, ...storedTask } = item({ id: "I_1" });
    const store = createMemoryStore({ [SNAPSHOT_KEY]: { tasks: [storedTask] } });
    const snapshot = await loadSnapshot(store);
    expect(snapshot.tasks[0].pullRequests).toEqual([]);
    expect(snapshot.reviews).toEqual([]);
  });

  it("keeps the stored pull requests", async () => {
    const pullRequests = [
      { title: "Sample", url: "https://github.com/acme/sample-repo/pull/2", number: 2, repository: "sample-repo", state: "open" as const, closesIssue: false },
    ];
    const store = createMemoryStore({ [SNAPSHOT_KEY]: { closed: [item({ pullRequests })] } });
    expect((await loadSnapshot(store)).closed[0].pullRequests).toEqual(pullRequests);
  });
});
