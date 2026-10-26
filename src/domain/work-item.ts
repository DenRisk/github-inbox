export type WorkItemKind = "review" | "task" | "closed";

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
  deadline: string | null;
}
