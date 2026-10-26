import { DEFAULT_SETTINGS, saveSettings } from "../../src/settings/settings";
import { createMemoryStore, type KeyValueStore } from "../../src/storage/key-value-store";
import { refresh } from "../../src/sync/refresh";
import { EMPTY_SNAPSHOT, loadSnapshot, SNAPSHOT_KEY, type Snapshot } from "../../src/sync/snapshot";
import type { FetchFn } from "../../src/github/graphql-client";
import { toResponse } from "../support/fake-fetch";
import { item } from "../support/work-item";

const now = () => new Date("2026-10-19T08:00:00Z");

type Extra = { deadline?: string; createdAt?: string };

function content(id: string, typename: string, extra: Extra) {
  return {
    __typename: typename,
    id,
    title: `Title ${id}`,
    body: "",
    url: `https://github.com/acme/sample-repo/issues/${id}`,
    createdAt: extra.createdAt ?? "2026-10-01T00:00:00Z",
    number: 1,
    repository: { name: "sample-repo" },
  };
}

function fieldValues(extra: Extra) {
  return { status: { name: "Todo" }, deadline: extra.deadline ? { date: extra.deadline } : null };
}

function boardNode(id: string, extra: Extra = {}) {
  return { ...fieldValues(extra), content: content(id, "Issue", extra) };
}

function requestedPullRequest(id: string, extra: Extra = {}) {
  return {
    ...content(id, "PullRequest", extra),
    projectItems: { nodes: [{ project: { number: 25 }, ...fieldValues(extra) }] },
  };
}

function closedIssue(id: string, closedAt: string) {
  return { ...content(id, "Issue", {}), closedAt };
}

function githubFetch({ reviews = [], tasks = [], closed = [] }: { reviews?: unknown[]; tasks?: unknown[]; closed?: unknown[] }) {
  const pageInfo = { hasNextPage: false, endCursor: null };
  return vi.fn<FetchFn>(async (_url, init) => {
    const { variables } = JSON.parse(init!.body as string);
    if (variables.search) {
      const nodes = variables.search.includes("is:closed") ? closed : reviews;
      return toResponse({ body: { data: { search: { pageInfo, nodes } } } });
    }
    const nodes = variables.number === 13 ? tasks : [];
    return toResponse({ body: { data: { organization: { projectV2: { items: { pageInfo, nodes } } } } } });
  });
}

async function storeWithToken(previous?: Snapshot): Promise<KeyValueStore> {
  const store = createMemoryStore(previous ? { [SNAPSHOT_KEY]: previous } : {});
  await saveSettings(store, { ...DEFAULT_SETTINGS, token: "test-token" });
  return store;
}

describe("refresh", () => {
  it("stores sorted reviews and tasks with the fetch time", async () => {
    const store = await storeWithToken();
    const fetchFn = githubFetch({
      reviews: [
        requestedPullRequest("PR_old", { createdAt: "2026-01-01T00:00:00Z" }),
        requestedPullRequest("PR_due", { deadline: "2026-10-20" }),
      ],
      tasks: [boardNode("I_1")],
    });
    const snapshot = await refresh({ store, fetchFn, now });
    expect(snapshot.reviews.map((i) => i.id)).toEqual(["PR_due", "PR_old"]);
    expect(snapshot.tasks.map((i) => i.id)).toEqual(["I_1"]);
    expect(snapshot.fetchedAt).toBe("2026-10-19T08:00:00.000Z");
    expect(snapshot.error).toBeNull();
    expect(await loadSnapshot(store)).toEqual(snapshot);
  });

  it("takes reviews from the review requests and tasks from the task board", async () => {
    const store = await storeWithToken();
    const snapshot = await refresh({
      store,
      fetchFn: githubFetch({ reviews: [requestedPullRequest("PR_1")], tasks: [boardNode("I_1")] }),
      now,
    });
    expect(snapshot.reviews.map((i) => [i.id, i.kind])).toEqual([["PR_1", "review"]]);
    expect(snapshot.tasks.map((i) => [i.id, i.kind])).toEqual([["I_1", "task"]]);
  });

  it("stores the issues closed in the last 30 days, the most recently closed first", async () => {
    const store = await storeWithToken();
    const fetchFn = githubFetch({
      closed: [closedIssue("I_earlier", "2026-10-02T09:00:00Z"), closedIssue("I_latest", "2026-10-18T09:00:00Z")],
    });
    const snapshot = await refresh({ store, fetchFn, now });
    expect(snapshot.closed.map((i) => [i.id, i.kind])).toEqual([
      ["I_latest", "closed"],
      ["I_earlier", "closed"],
    ]);
    const searches = fetchFn.mock.calls.map(([, init]) => JSON.parse(init!.body as string).variables.search);
    expect(searches).toContain("is:issue is:closed assignee:@me closed:>=2026-09-19 org:sw-code");
  });

  it("reports no-token without calling GitHub and keeps the previous items", async () => {
    const previous = { ...EMPTY_SNAPSHOT, reviews: [item({ id: "PR_kept", kind: "review" })] };
    const store = createMemoryStore({ [SNAPSHOT_KEY]: previous });
    const fetchFn = githubFetch({});
    const snapshot = await refresh({ store, fetchFn, now });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(snapshot.reviews.map((i) => i.id)).toEqual(["PR_kept"]);
    expect(snapshot.error?.kind).toBe("no-token");
  });

  it("keeps the previous items and time when GitHub fails", async () => {
    const previous: Snapshot = {
      reviews: [item({ id: "PR_kept", kind: "review" })],
      tasks: [item({ id: "I_kept" })],
      closed: [item({ id: "I_closed_kept", kind: "closed" })],
      fetchedAt: "2026-10-19T07:00:00.000Z",
      error: null,
    };
    const store = await storeWithToken(previous);
    const fetchFn = vi.fn<FetchFn>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const snapshot = await refresh({ store, fetchFn, now });
    expect(snapshot.reviews).toEqual(previous.reviews);
    expect(snapshot.tasks).toEqual(previous.tasks);
    expect(snapshot.closed).toEqual(previous.closed);
    expect(snapshot.fetchedAt).toBe(previous.fetchedAt);
    expect(snapshot.error?.kind).toBe("network");
    expect(await loadSnapshot(store)).toEqual(snapshot);
  });

  it("starts from an empty snapshot when nothing is stored", async () => {
    expect(await loadSnapshot(createMemoryStore())).toEqual(EMPTY_SNAPSHOT);
  });

  it("gives a snapshot stored before the closed tab existed an empty closed list", async () => {
    const stored = { reviews: [], tasks: [item()], fetchedAt: null, error: null };
    const snapshot = await loadSnapshot(createMemoryStore({ [SNAPSHOT_KEY]: stored }));
    expect(snapshot.closed).toEqual([]);
    expect(snapshot.tasks).toEqual(stored.tasks);
  });
});
