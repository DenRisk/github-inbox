import type { LinkedPullRequest, WorkItem } from "../../src/domain/work-item";

export function item(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "I_sample",
    kind: "task",
    title: "Sample task",
    body: "Sample description",
    url: "https://github.com/acme/sample-repo/issues/1",
    createdAt: "2026-10-01T08:00:00Z",
    closedAt: null,
    repository: "sample-repo",
    number: 1,
    status: null,
    statusColor: null,
    deadline: null,
    pullRequests: [],
    branches: null,
    ...overrides,
  };
}

export function linkedPullRequest(overrides: Partial<LinkedPullRequest> = {}): LinkedPullRequest {
  return {
    title: "Sample pull request",
    url: "https://github.com/acme/sample-repo/pull/2",
    number: 2,
    repository: "sample-repo",
    state: "open",
    closesIssue: false,
    branches: null,
    review: null,
    ...overrides,
  };
}
