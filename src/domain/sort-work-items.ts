import type { WorkItem } from "./work-item";

function compareByDeadlineThenNewest(a: WorkItem, b: WorkItem): number {
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function sortWorkItems(items: WorkItem[]): WorkItem[] {
  return [...items].sort(compareByDeadlineThenNewest);
}

export function sortMostRecentlyClosedFirst(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
}
