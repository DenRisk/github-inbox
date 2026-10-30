import type { LinkedPullRequest } from "./work-item";

export interface MergeProgress {
  merged: number;
  total: number;
  complete: boolean;
}

export function mergeProgress(pullRequests: LinkedPullRequest[]): MergeProgress | null {
  const stillCounting = pullRequests.filter((pullRequest) => pullRequest.state !== "closed");
  const merged = stillCounting.filter((pullRequest) => pullRequest.state === "merged").length;
  if (!merged) return null;
  return { merged, total: stillCounting.length, complete: merged === stillCounting.length };
}
