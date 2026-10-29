import type { WorkItem } from "../domain/work-item";
import type { GithubErrorKind } from "../github/graphql-client";
import type { KeyValueStore } from "../storage/key-value-store";

export type SyncErrorKind = GithubErrorKind | "no-token";

export interface Snapshot {
  reviews: WorkItem[];
  tasks: WorkItem[];
  closed: WorkItem[];
  fetchedAt: string | null;
  error: { kind: SyncErrorKind; message: string } | null;
}

export const SNAPSHOT_KEY = "snapshot";

export const EMPTY_SNAPSHOT: Snapshot = { reviews: [], tasks: [], closed: [], fetchedAt: null, error: null };

type StoredItem = Omit<WorkItem, "pullRequests"> & Partial<Pick<WorkItem, "pullRequests">>;

function withPullRequests(items: StoredItem[]): WorkItem[] {
  return items.map((item) => ({ ...item, pullRequests: item.pullRequests ?? [] }));
}

export async function loadSnapshot(store: KeyValueStore): Promise<Snapshot> {
  const stored = { ...EMPTY_SNAPSHOT, ...(await store.get<Partial<Snapshot>>(SNAPSHOT_KEY)) };
  return {
    ...stored,
    reviews: withPullRequests(stored.reviews),
    tasks: withPullRequests(stored.tasks),
    closed: withPullRequests(stored.closed),
  };
}
