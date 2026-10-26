import type { WorkItem } from "../../src/domain/work-item";

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
    deadline: null,
    ...overrides,
  };
}
