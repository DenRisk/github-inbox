import type { FetchFn } from "../../src/github/graphql-client";
import { DEFAULT_SETTINGS, saveSettings } from "../../src/settings/settings";
import { createMemoryStore } from "../../src/storage/key-value-store";
import { loadSnapshot } from "../../src/sync/snapshot";
import { createWebPorts } from "../../src/web/web-ports";
import { toResponse } from "../support/fake-fetch";

const pageInfo = { hasNextPage: false, endCursor: null };

const requestedPullRequest = {
  __typename: "PullRequest",
  id: "PR_1",
  title: "Sample pull request",
  body: "",
  url: "https://github.com/acme/sample-repo/pull/1",
  createdAt: "2026-10-01T00:00:00Z",
  number: 1,
  repository: { name: "sample-repo" },
  projectItems: { nodes: [] },
};

function githubWithOneReview() {
  return vi.fn<FetchFn>(async () =>
    toResponse({
      body: {
        data: {
          search: { pageInfo, nodes: [requestedPullRequest] },
          organization: { projectV2: { items: { pageInfo, nodes: [] } } },
        },
      },
    }),
  );
}

async function setup() {
  const store = createMemoryStore();
  await saveSettings(store, { ...DEFAULT_SETTINGS, token: "test-token" });
  const fetchFn = githubWithOneReview();
  const setBadge = vi.fn();
  const ports = createWebPorts({
    store,
    fetchFn,
    now: () => new Date("2026-10-26T10:00:00Z"),
    setBadge,
    openOptions: vi.fn(),
    openUrl: vi.fn(),
  });
  return { store, fetchFn, setBadge, ports };
}

describe("createWebPorts", () => {
  it("refreshes from GitHub and stores the snapshot", async () => {
    const { store, ports } = await setup();
    const snapshot = await ports.requestRefresh();
    expect(snapshot.reviews.map((r) => r.id)).toEqual(["PR_1"]);
    expect(await loadSnapshot(store)).toEqual(snapshot);
  });

  it("shows the number of waiting reviews on the app icon", async () => {
    const { setBadge, ports } = await setup();
    await ports.requestRefresh();
    expect(setBadge).toHaveBeenCalledWith(1);
  });

  it("tells the subscribers about a new snapshot until they unsubscribe", async () => {
    const { ports } = await setup();
    const listener = vi.fn();
    const unsubscribe = ports.onSnapshotChange(listener);
    const snapshot = await ports.requestRefresh();
    expect(listener).toHaveBeenCalledWith(snapshot);
    unsubscribe();
    await ports.requestRefresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("runs overlapping refresh requests only once", async () => {
    const { fetchFn, ports } = await setup();
    await Promise.all([ports.requestRefresh(), ports.requestRefresh()]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
