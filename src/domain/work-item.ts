export type WorkItemKind = "review" | "task" | "closed";

export type StatusColor = "GRAY" | "BLUE" | "GREEN" | "YELLOW" | "ORANGE" | "RED" | "PINK" | "PURPLE";

export type PullRequestState = "open" | "draft" | "merged" | "closed";

export interface LinkedPullRequest {
  title: string;
  url: string;
  number: number;
  repository: string;
  state: PullRequestState;
  closesIssue: boolean;
}

export interface WorkItem {
  id: string;
  kind: WorkItemKind;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  closedAt: string | null;
  repository: string;
  number: number;
  status: string | null;
  statusColor: StatusColor | null;
  deadline: string | null;
  pullRequests: LinkedPullRequest[];
  branches: { base: string; head: string } | null;
}
