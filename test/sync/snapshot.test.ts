import { createMemoryStore } from "../../src/storage/key-value-store";
import { EMPTY_SNAPSHOT, loadSnapshot, SNAPSHOT_KEY } from "../../src/sync/snapshot";
import { item, linkedPullRequest } from "../support/work-item";

describe("loadSnapshot", () => {
  it("starts empty without a stored snapshot", async () => {
    expect(await loadSnapshot(createMemoryStore())).toEqual(EMPTY_SNAPSHOT);
  });

  it("gives items stored before pull requests, status colors and branches were fetched empty values", async () => {
    const { pullRequests: _, statusColor: __, branches: ___, ...storedTask } = item({ id: "I_1" });
    const store = createMemoryStore({ [SNAPSHOT_KEY]: { tasks: [storedTask] } });
    const snapshot = await loadSnapshot(store);
    expect(snapshot.tasks[0].pullRequests).toEqual([]);
    expect(snapshot.tasks[0].statusColor).toBeNull();
    expect(snapshot.tasks[0].branches).toBeNull();
    expect(snapshot.reviews).toEqual([]);
  });

  it("keeps the stored pull requests", async () => {
    const pullRequests = [linkedPullRequest({ branches: { base: "main", head: "step-1" }, review: "approved" })];
    const store = createMemoryStore({ [SNAPSHOT_KEY]: { closed: [item({ pullRequests })] } });
    expect((await loadSnapshot(store)).closed[0].pullRequests).toEqual(pullRequests);
  });

  it("gives pull requests stored before branches and reviews were fetched empty values", async () => {
    const { branches: _, review: __, ...storedPullRequest } = linkedPullRequest();
    const store = createMemoryStore({ [SNAPSHOT_KEY]: { tasks: [{ ...item(), pullRequests: [storedPullRequest] }] } });
    const [pullRequest] = (await loadSnapshot(store)).tasks[0].pullRequests;
    expect(pullRequest.branches).toBeNull();
    expect(pullRequest.review).toBeNull();
  });
});
