import { localDateKey } from "../domain/dates";
import { sortMostRecentlyClosedFirst, sortWorkItems } from "../domain/sort-work-items";
import { fetchClosedIssues } from "../github/closed-issues";
import { GithubError, type FetchFn } from "../github/graphql-client";
import { fetchProjectItems } from "../github/project-items";
import { fetchReviewRequests } from "../github/review-requests";
import { loadSettings, type Settings } from "../settings/settings";
import type { KeyValueStore } from "../storage/key-value-store";
import { loadSnapshot, SNAPSHOT_KEY, type Snapshot } from "./snapshot";

export interface RefreshDeps {
  store: KeyValueStore;
  fetchFn: FetchFn;
  now: () => Date;
}

function toSyncError(error: unknown): Snapshot["error"] {
  if (error instanceof GithubError) return { kind: error.kind, message: error.message };
  return { kind: "other", message: error instanceof Error ? error.message : String(error) };
}

const CLOSED_WINDOW_DAYS = 30;

function closedWindowStart(now: Date): string {
  const start = new Date(now);
  start.setDate(start.getDate() - CLOSED_WINDOW_DAYS);
  return localDateKey(start);
}

async function fetchAll(
  deps: RefreshDeps,
  settings: Settings,
  token: string,
): Promise<Pick<Snapshot, "reviews" | "tasks" | "closed">> {
  const access = { token, organization: settings.organization, fetchFn: deps.fetchFn };
  const [reviews, tasks, closed] = await Promise.all([
    fetchReviewRequests({ ...access, ...settings.reviews }),
    fetchProjectItems({ ...access, ...settings.tasks, kind: "task" }),
    fetchClosedIssues({ ...access, closedSince: closedWindowStart(deps.now()) }),
  ]);
  return { reviews: sortWorkItems(reviews), tasks: sortWorkItems(tasks), closed: sortMostRecentlyClosedFirst(closed) };
}

async function nextSnapshot(deps: RefreshDeps): Promise<Snapshot> {
  const previous = await loadSnapshot(deps.store);
  const settings = await loadSettings(deps.store);
  if (!settings.token) {
    return { ...previous, error: { kind: "no-token", message: "Kein GitHub-Token hinterlegt." } };
  }
  try {
    return { ...(await fetchAll(deps, settings, settings.token)), fetchedAt: deps.now().toISOString(), error: null };
  } catch (error) {
    return { ...previous, error: toSyncError(error) };
  }
}

export async function refresh(deps: RefreshDeps): Promise<Snapshot> {
  const snapshot = await nextSnapshot(deps);
  await deps.store.set(SNAPSHOT_KEY, snapshot);
  return snapshot;
}
