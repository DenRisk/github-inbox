import type { Branches } from "./work-item";

interface Stackable {
  repository: string;
  branches: Branches | null;
}

export interface StackGroup<T extends Stackable> {
  items: T[];
  isStack: boolean;
  base: string | null;
}

function branchKey(repository: string, branch: string): string {
  return `${repository}:${branch}`;
}

export function groupStacks<T extends Stackable>(items: T[]): StackGroup<T>[] {
  const byHead = new Map<string, T>();
  for (const item of items) {
    if (item.branches) byHead.set(branchKey(item.repository, item.branches.head), item);
  }
  const parentOf = (item: T) =>
    item.branches ? byHead.get(branchKey(item.repository, item.branches.base)) : undefined;

  const childrenOf = new Map<T, T[]>();
  for (const item of items) {
    const parent = parentOf(item);
    if (parent && parent !== item) childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), item]);
  }

  function lowestOf(item: T): T {
    const visited = new Set([item]);
    let lowest = item;
    for (let parent = parentOf(lowest); parent && !visited.has(parent); parent = parentOf(lowest)) {
      visited.add(parent);
      lowest = parent;
    }
    return lowest;
  }

  const placed = new Set<T>();
  function collectUpwards(item: T): T[] {
    if (placed.has(item)) return [];
    placed.add(item);
    return [item, ...(childrenOf.get(item) ?? []).flatMap(collectUpwards)];
  }

  const groups: StackGroup<T>[] = [];
  for (const item of items) {
    if (placed.has(item)) continue;
    const lowest = lowestOf(item);
    const members = collectUpwards(lowest);
    groups.push({ items: members, isStack: members.length > 1, base: lowest.branches?.base ?? null });
  }
  return groups;
}

export function singlesBeforeStacks<T extends Stackable>(groups: StackGroup<T>[]): StackGroup<T>[] {
  return [...groups.filter((group) => !group.isStack), ...groups.filter((group) => group.isStack)];
}
