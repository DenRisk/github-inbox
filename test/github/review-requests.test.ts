import { GithubError } from "../../src/github/graphql-client";
import { fetchReviewRequests } from "../../src/github/review-requests";
import { fakeFetch, requestBody } from "../support/fake-fetch";

const pullRequest = {
  __typename: "PullRequest",
  id: "PR_1",
  title: "Sample pull request",
  body: "Text",
  url: "https://github.com/acme/sample-repo/pull/7",
  createdAt: "2026-10-12T11:20:38Z",
  number: 7,
  repository: { name: "sample-repo" },
  projectItems: { nodes: [] as unknown[] },
};

function boardItem(projectNumber: number, status: string | null, deadline: string | null) {
  return {
    project: { number: projectNumber },
    status: status ? { name: status } : null,
    deadline: deadline ? { date: deadline } : null,
  };
}

function page(nodes: unknown[], endCursor: string | null = null) {
  return { body: { data: { search: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes } } } };
}

const params = {
  token: "test-token",
  organization: "sw-code",
  projectNumber: 25,
  query: "is:pr is:open review-requested:@me",
};

describe("fetchReviewRequests", () => {
  it("maps a requested pull request to a review with status and deadline from the board", async () => {
    const fetchFn = fakeFetch(
      page([{ ...pullRequest, projectItems: { nodes: [boardItem(25, "Inbox", "2026-10-24")] } }]),
    );
    expect(await fetchReviewRequests({ ...params, fetchFn })).toEqual([
      {
        id: "PR_1",
        kind: "review",
        title: "Sample pull request",
        body: "Text",
        url: "https://github.com/acme/sample-repo/pull/7",
        createdAt: "2026-10-12T11:20:38Z",
        closedAt: null,
        repository: "sample-repo",
        number: 7,
        status: "Inbox",
        deadline: "2026-10-24",
        pullRequests: [],
      },
    ]);
  });

  it("takes status and deadline only from the configured board", async () => {
    const fetchFn = fakeFetch(
      page([
        {
          ...pullRequest,
          projectItems: { nodes: [boardItem(13, "Todo", "2026-11-01"), boardItem(25, "Approved", null)] },
        },
      ]),
    );
    const [review] = await fetchReviewRequests({ ...params, fetchFn });
    expect(review.status).toBe("Approved");
    expect(review.deadline).toBeNull();
  });

  it("keeps a pull request that is not on the board, without status and deadline", async () => {
    const fetchFn = fakeFetch(page([pullRequest]));
    const [review] = await fetchReviewRequests({ ...params, fetchFn });
    expect(review.status).toBeNull();
    expect(review.deadline).toBeNull();
  });

  it("treats a missing body as empty", async () => {
    const fetchFn = fakeFetch(page([{ ...pullRequest, body: null }]));
    const [review] = await fetchReviewRequests({ ...params, fetchFn });
    expect(review.body).toBe("");
  });

  it("skips search results that are not pull requests", async () => {
    const fetchFn = fakeFetch(page([{ __typename: "Issue" }, null, pullRequest]));
    expect((await fetchReviewRequests({ ...params, fetchFn })).map((r) => r.id)).toEqual(["PR_1"]);
  });

  it("limits the search to the organization", async () => {
    const fetchFn = fakeFetch(page([]));
    await fetchReviewRequests({ ...params, fetchFn });
    expect(requestBody(fetchFn).variables).toEqual({
      search: "is:pr is:open review-requested:@me org:sw-code",
      after: null,
    });
  });

  it("follows pagination until hasNextPage is false", async () => {
    const fetchFn = fakeFetch(page([pullRequest], "CURSOR_1"), page([{ ...pullRequest, id: "PR_2" }]));
    const reviews = await fetchReviewRequests({ ...params, fetchFn });
    expect(reviews.map((r) => r.id)).toEqual(["PR_1", "PR_2"]);
    expect(requestBody(fetchFn, 1).variables.after).toBe("CURSOR_1");
  });

  it("keeps the readable pull requests when GitHub hides the board of one of them", async () => {
    const response = page([pullRequest, { ...pullRequest, id: "PR_2", projectItems: null }]);
    const fetchFn = fakeFetch({
      body: {
        ...response.body,
        errors: [
          {
            type: "FORBIDDEN",
            message: "Resource protected by organization SAML enforcement.",
            path: ["search", "nodes", 1, "projectItems"],
          },
        ],
      },
    });
    expect((await fetchReviewRequests({ ...params, fetchFn })).map((r) => r.id)).toEqual(["PR_1", "PR_2"]);
  });

  it("still fails on an error that concerns the whole search", async () => {
    const fetchFn = fakeFetch({
      body: { errors: [{ type: "INSUFFICIENT_SCOPES", message: "Your token has not been granted the required scopes." }] },
    });
    const error = await fetchReviewRequests({ ...params, fetchFn }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GithubError);
    expect((error as GithubError).kind).toBe("insufficient-scopes");
  });
});
