import type { WorkItem } from "../domain/work-item";
import { postGraphql, type GithubAccess, type GraphqlError } from "./graphql-client";
import {
  LINKED_PULL_REQUEST_FRAGMENT,
  LINKED_PULL_REQUESTS_FIELDS,
  toLinkedPullRequests,
  type LinkedPullRequestsNode,
} from "./linked-pull-requests";

const CLOSED_ISSUES_QUERY = `
query ClosedIssues($search: String!, $after: String) {
  search(type: ISSUE, first: 100, after: $after, query: $search) {
    pageInfo { hasNextPage endCursor }
    nodes {
      __typename
      ... on Issue { id title body url createdAt closedAt number repository { name } ${LINKED_PULL_REQUESTS_FIELDS} }
    }
  }
}
${LINKED_PULL_REQUEST_FRAGMENT}`;

interface IssueNode extends LinkedPullRequestsNode {
  __typename: "Issue";
  id: string;
  title: string;
  body: string | null;
  url: string;
  createdAt: string;
  closedAt: string | null;
  number: number;
  repository: { name: string };
}

interface ClosedIssuesResponse {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: ({ __typename: string } | null)[];
  };
}

function concernsSingleIssue(error: GraphqlError): boolean {
  const path = error.path ?? [];
  return path[0] === "search" && path[1] === "nodes" && typeof path[2] === "number" && path.length > 3;
}

function isIssue(node: { __typename: string } | null): node is IssueNode {
  return node?.__typename === "Issue";
}

function toClosedItem(issue: IssueNode): WorkItem {
  return {
    id: issue.id,
    kind: "closed",
    title: issue.title,
    body: issue.body ?? "",
    url: issue.url,
    createdAt: issue.createdAt,
    closedAt: issue.closedAt,
    repository: issue.repository.name,
    number: issue.number,
    status: null,
    deadline: null,
    pullRequests: toLinkedPullRequests(issue),
  };
}

export async function fetchClosedIssues(params: GithubAccess & { closedSince: string }): Promise<WorkItem[]> {
  const search = `is:issue is:closed assignee:@me closed:>=${params.closedSince} org:${params.organization}`;
  const closed: WorkItem[] = [];
  let after: string | null = null;
  do {
    const data: ClosedIssuesResponse = await postGraphql<ClosedIssuesResponse>(
      params,
      CLOSED_ISSUES_QUERY,
      { search, after },
      concernsSingleIssue,
    );
    closed.push(...data.search.nodes.filter(isIssue).map(toClosedItem));
    after = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
  } while (after);
  return closed;
}
