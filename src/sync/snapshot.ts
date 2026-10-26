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

export async function loadSnapshot(store: KeyValueStore): Promise<Snapshot> {
  return { ...EMPTY_SNAPSHOT, ...(await store.get<Partial<Snapshot>>(SNAPSHOT_KEY)) };
}
