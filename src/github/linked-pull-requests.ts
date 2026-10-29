import type { LinkedPullRequest, PullRequestState } from "../domain/work-item";

export const LINKED_PULL_REQUESTS_FIELDS = `
closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { ...LinkedPullRequest } }
timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
  nodes { ... on CrossReferencedEvent { source { __typename ...LinkedPullRequest } } }
}`;

export const LINKED_PULL_REQUEST_FRAGMENT = `
fragment LinkedPullRequest on PullRequest { title url number state isDraft repository { name } }`;

interface PullRequestNode {
  title: string;
  url: string;
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  repository: { name: string };
}

interface ReferenceSource {
  __typename: string;
}

export interface LinkedPullRequestsNode {
  closedByPullRequestsReferences?: { nodes: (PullRequestNode | null)[] } | null;
  timelineItems?: { nodes: ({ source?: ReferenceSource | null } | null)[] } | null;
}

function stateOf(pullRequest: PullRequestNode): PullRequestState {
  if (pullRequest.state === "MERGED") return "merged";
  if (pullRequest.state === "CLOSED") return "closed";
  return pullRequest.isDraft ? "draft" : "open";
}

function toLinked(pullRequest: PullRequestNode, closesIssue: boolean): LinkedPullRequest {
  return {
    title: pullRequest.title,
    url: pullRequest.url,
    number: pullRequest.number,
    repository: pullRequest.repository.name,
    state: stateOf(pullRequest),
    closesIssue,
  };
}

function isPullRequest(source: ReferenceSource | null | undefined): source is ReferenceSource & PullRequestNode {
  return source?.__typename === "PullRequest";
}

export function toLinkedPullRequests(node: LinkedPullRequestsNode): LinkedPullRequest[] {
  const closing = (node.closedByPullRequestsReferences?.nodes ?? [])
    .filter((pullRequest) => pullRequest !== null)
    .map((pullRequest) => toLinked(pullRequest, true));
  const mentioning = (node.timelineItems?.nodes ?? [])
    .map((event) => event?.source)
    .filter(isPullRequest)
    .map((pullRequest) => toLinked(pullRequest, false));
  const byUrl = new Map<string, LinkedPullRequest>();
  for (const pullRequest of [...closing, ...mentioning]) {
    if (!byUrl.has(pullRequest.url)) byUrl.set(pullRequest.url, pullRequest);
  }
  return [...byUrl.values()];
}
