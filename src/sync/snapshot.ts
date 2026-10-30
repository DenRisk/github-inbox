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

type AddedLater = "pullRequests" | "statusColor" | "branches";

type StoredItem = Omit<WorkItem, AddedLater> & Partial<Pick<WorkItem, AddedLater>>;

function withCurrentFields(items: StoredItem[]): WorkItem[] {
  return items.map((item) => ({
    ...item,
    pullRequests: item.pullRequests ?? [],
    statusColor: item.statusColor ?? null,
    branches: item.branches ?? null,
  }));
}

export async function loadSnapshot(store: KeyValueStore): Promise<Snapshot> {
  const stored = { ...EMPTY_SNAPSHOT, ...(await store.get<Partial<Snapshot>>(SNAPSHOT_KEY)) };
  return {
    ...stored,
    reviews: withCurrentFields(stored.reviews),
    tasks: withCurrentFields(stored.tasks),
    closed: withCurrentFields(stored.closed),
  };
}
