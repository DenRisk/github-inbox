export type WorkItemKind = "review" | "task" | "closed";

export type StatusColor = "GRAY" | "BLUE" | "GREEN" | "YELLOW" | "ORANGE" | "RED" | "PINK" | "PURPLE";

export type PullRequestState = "open" | "draft" | "merged" | "closed";

export type ReviewState = "approved" | "changes-requested" | "required";

export interface Branches {
  base: string;
  head: string;
}

export interface LinkedPullRequest {
  title: string;
  url: string;
  number: number;
  repository: string;
  state: PullRequestState;
  closesIssue: boolean;
  branches: Branches | null;
  review: ReviewState | null;
}

export interface IssueRef {
  id: string;
  title: string;
  url: string;
  number: number;
  repository: string;
}

export interface SubIssueSummary {
  total: number;
  completed: number;
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
  branches: Branches | null;
  parent?: IssueRef | null;
  subIssues?: SubIssueSummary | null;
}
