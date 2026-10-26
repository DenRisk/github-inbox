import type { WorkItem } from "../domain/work-item";
import { postGraphql, type GithubAccess, type GraphqlError } from "./graphql-client";

const REVIEW_REQUESTS_QUERY = `
query ReviewRequests($search: String!, $after: String) {
  search(type: ISSUE, first: 100, after: $after, query: $search) {
    pageInfo { hasNextPage endCursor }
    nodes {
      __typename
      ... on PullRequest {
        id title body url createdAt number repository { name }
        projectItems(first: 20) {
          nodes {
            project { number }
            status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
            deadline: fieldValueByName(name: "Deadline-EOBD") { ... on ProjectV2ItemFieldDateValue { date } }
          }
        }
      }
    }
  }
}`;

interface BoardItem {
  project: { number: number };
  status: { name?: string } | null;
  deadline: { date?: string } | null;
}

interface PullRequestNode {
  __typename: "PullRequest";
  id: string;
  title: string;
  body: string | null;
  url: string;
  createdAt: string;
  number: number;
  repository: { name: string };
  projectItems: { nodes: (BoardItem | null)[] } | null;
}

interface ReviewRequestsResponse {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: ({ __typename: string } | null)[];
  };
}

function concernsSinglePullRequest(error: GraphqlError): boolean {
  const path = error.path ?? [];
  return path[0] === "search" && path[1] === "nodes" && typeof path[2] === "number" && path.length > 3;
}

function isPullRequest(node: { __typename: string } | null): node is PullRequestNode {
  return node?.__typename === "PullRequest";
}

function toReview(pullRequest: PullRequestNode, projectNumber: number): WorkItem {
  const boardItem = pullRequest.projectItems?.nodes.find((item) => item?.project.number === projectNumber);
  return {
    id: pullRequest.id,
    kind: "review",
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    url: pullRequest.url,
    createdAt: pullRequest.createdAt,
    closedAt: null,
    repository: pullRequest.repository.name,
    number: pullRequest.number,
    status: boardItem?.status?.name ?? null,
    deadline: boardItem?.deadline?.date ?? null,
  };
}

export async function fetchReviewRequests(
  params: GithubAccess & { projectNumber: number; query: string },
): Promise<WorkItem[]> {
  const search = `${params.query} org:${params.organization}`;
  const reviews: WorkItem[] = [];
  let after: string | null = null;
  do {
    const data: ReviewRequestsResponse = await postGraphql<ReviewRequestsResponse>(
      params,
      REVIEW_REQUESTS_QUERY,
      { search, after },
      concernsSinglePullRequest,
    );
    reviews.push(...data.search.nodes.filter(isPullRequest).map((node) => toReview(node, params.projectNumber)));
    after = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
  } while (after);
  return reviews;
}
