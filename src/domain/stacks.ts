import type { WorkItem } from "./work-item";

export interface WorkGroup {
  items: WorkItem[];
  isStack: boolean;
  base: string | null;
}

function branchKey(repository: string, branch: string): string {
  return `${repository}:${branch}`;
}

export function groupStacks(items: WorkItem[]): WorkGroup[] {
  const byHead = new Map<string, WorkItem>();
  for (const item of items) {
    if (item.branches) byHead.set(branchKey(item.repository, item.branches.head), item);
  }
  const parentOf = (item: WorkItem) =>
    item.branches ? byHead.get(branchKey(item.repository, item.branches.base)) : undefined;

  const childrenOf = new Map<WorkItem, WorkItem[]>();
  for (const item of items) {
    const parent = parentOf(item);
    if (parent && parent !== item) childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), item]);
  }

  function lowestOf(item: WorkItem): WorkItem {
    const visited = new Set([item]);
    let lowest = item;
    for (let parent = parentOf(lowest); parent && !visited.has(parent); parent = parentOf(lowest)) {
      visited.add(parent);
      lowest = parent;
    }
    return lowest;
  }

  const placed = new Set<WorkItem>();
  function collectUpwards(item: WorkItem): WorkItem[] {
    if (placed.has(item)) return [];
    placed.add(item);
    return [item, ...(childrenOf.get(item) ?? []).flatMap(collectUpwards)];
  }

  const groups: WorkGroup[] = [];
  for (const item of items) {
    if (placed.has(item)) continue;
    const lowest = lowestOf(item);
    const members = collectUpwards(lowest);
    groups.push({ items: members, isStack: members.length > 1, base: lowest.branches?.base ?? null });
  }
  return groups;
}
