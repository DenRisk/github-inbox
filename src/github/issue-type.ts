import { deriveIssueType, type IssueType } from "../domain/issue-type";
import { statusColorOf, type StatusValue } from "./board-status";

export const ISSUE_TYPE_FIELDS = `issueType { name color } labels(first: 20) { nodes { name } } subIssuesSummary { total completed }`;

export interface IssueTypeNode {
  title: string;
  issueType?: StatusValue | null;
  labels?: { nodes: ({ name: string } | null)[] } | null;
  subIssuesSummary?: { total: number; completed: number } | null;
}

function declaredType(value: StatusValue | null | undefined): IssueType | null {
  return value?.name ? { name: value.name, color: statusColorOf(value) ?? "GRAY" } : null;
}

export function toIssueType(node: IssueTypeNode): IssueType | null {
  return deriveIssueType({
    declared: declaredType(node.issueType),
    hasSubIssues: (node.subIssuesSummary?.total ?? 0) > 0,
    title: node.title,
    labels: (node.labels?.nodes ?? []).flatMap((label) => (label ? [label.name] : [])),
  });
}
