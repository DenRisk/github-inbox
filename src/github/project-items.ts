import type { WorkItem, WorkItemKind } from "../domain/work-item";
import { STATUS_FIELD, statusColorOf, type StatusValue } from "./board-status";
import { GithubError, postGraphql, type GithubAccess, type GraphqlError } from "./graphql-client";
import {
  LINKED_PULL_REQUEST_FRAGMENT,
  LINKED_PULL_REQUESTS_FIELDS,
  toLinkedPullRequests,
  type LinkedPullRequestsNode,
} from "./linked-pull-requests";

const PROJECT_ITEMS_QUERY = `
query ProjectItems($org: String!, $number: Int!, $query: String!, $after: String) {
  organization(login: $org) {
    projectV2(number: $number) {
      items(first: 100, after: $after, query: $query) {
        pageInfo { hasNextPage endCursor }
        nodes {
          ${STATUS_FIELD}
          deadline: fieldValueByName(name: "Deadline-EOBD") { ... on ProjectV2ItemFieldDateValue { date } }
          content {
            __typename
            ... on Issue { id title body url createdAt number repository { name } ${LINKED_PULL_REQUESTS_FIELDS} }
            ... on PullRequest { id title body url createdAt number repository { name } }
          }
        }
      }
    }
  }
}
${LINKED_PULL_REQUEST_FRAGMENT}`;

interface ItemContent extends LinkedPullRequestsNode {
  __typename: string;
  id: string;
  title: string;
  body: string | null;
  url: string;
  createdAt: string;
  number: number;
  repository: { name: string };
}

interface ItemNode {
  status: StatusValue | null;
  deadline: { date?: string } | null;
  content: ItemContent | null;
}

interface ProjectItemsResponse {
  organization: {
    projectV2: {
      items: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ItemNode[] };
    } | null;
  } | null;
}

function concernsSingleItemContent(error: GraphqlError): boolean {
  const path = error.path ?? [];
  const nodesAt = path.indexOf("nodes");
  return nodesAt > 0 && path[nodesAt - 1] === "items" && typeof path[nodesAt + 1] === "number" && path.length > nodesAt + 2;
}

function hasIssueOrPullRequest(node: ItemNode): node is ItemNode & { content: ItemContent } {
  return node.content?.__typename === "Issue" || node.content?.__typename === "PullRequest";
}

function toWorkItem(node: ItemNode & { content: ItemContent }, kind: WorkItemKind): WorkItem {
  const { content } = node;
  return {
    id: content.id,
    kind,
    title: content.title,
    body: content.body ?? "",
    url: content.url,
    createdAt: content.createdAt,
    closedAt: null,
    repository: content.repository.name,
    number: content.number,
    status: node.status?.name ?? null,
    statusColor: statusColorOf(node.status),
    deadline: node.deadline?.date ?? null,
    pullRequests: toLinkedPullRequests(content),
    branches: null,
  };
}

export async function fetchProjectItems(
  params: GithubAccess & { projectNumber: number; query: string; kind: WorkItemKind },
): Promise<WorkItem[]> {
  const items: WorkItem[] = [];
  let after: string | null = null;
  do {
    const data: ProjectItemsResponse = await postGraphql<ProjectItemsResponse>(
      params,
      PROJECT_ITEMS_QUERY,
      { org: params.organization, number: params.projectNumber, query: params.query, after },
      concernsSingleItemContent,
    );
    const project = data.organization?.projectV2;
    if (!project) {
      throw new GithubError(
        "other",
        `Projekt ${params.projectNumber} in ${params.organization} ist nicht sichtbar.`,
      );
    }
    items.push(...project.items.nodes.filter(hasIssueOrPullRequest).map((node) => toWorkItem(node, params.kind)));
    after = project.items.pageInfo.hasNextPage ? project.items.pageInfo.endCursor : null;
  } while (after);
  return items;
}
