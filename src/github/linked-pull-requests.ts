import type { LinkedPullRequest, PullRequestState, ReviewState } from "../domain/work-item";

export const LINKED_PULL_REQUESTS_FIELDS = `
closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { ...LinkedPullRequest } }
timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
  nodes { ... on CrossReferencedEvent { source { __typename ...LinkedPullRequest } } }
}`;

export const LINKED_PULL_REQUEST_FRAGMENT = `
fragment LinkedPullRequest on PullRequest {
  title url number state isDraft repository { name } baseRefName headRefName reviewDecision
}`;

interface PullRequestNode {
  title: string;
  url: string;
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  repository: { name: string };
  baseRefName?: string | null;
  headRefName?: string | null;
  reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
}

const REVIEW_STATES: Record<string, ReviewState> = {
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes-requested",
  REVIEW_REQUIRED: "required",
};

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
    branches:
      pullRequest.baseRefName && pullRequest.headRefName
        ? { base: pullRequest.baseRefName, head: pullRequest.headRefName }
        : null,
    review: pullRequest.reviewDecision ? REVIEW_STATES[pullRequest.reviewDecision] ?? null : null,
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
