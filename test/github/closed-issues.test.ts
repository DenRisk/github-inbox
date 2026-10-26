import { GithubError } from "../../src/github/graphql-client";
import { fetchClosedIssues } from "../../src/github/closed-issues";
import { fakeFetch, requestBody } from "../support/fake-fetch";

const issue = {
  __typename: "Issue",
  id: "I_1",
  title: "Sample issue",
  body: "Text",
  url: "https://github.com/acme/sample-repo/issues/7",
  createdAt: "2026-10-01T08:00:00Z",
  closedAt: "2026-10-20T15:30:00Z",
  number: 7,
  repository: { name: "sample-repo" },
};

function page(nodes: unknown[], endCursor: string | null = null) {
  return { body: { data: { search: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes } } } };
}

const params = { token: "test-token", organization: "sw-code", closedSince: "2026-09-26" };

describe("fetchClosedIssues", () => {
  it("maps a closed issue to a work item with its closing time", async () => {
    const fetchFn = fakeFetch(page([issue]));
    expect(await fetchClosedIssues({ ...params, fetchFn })).toEqual([
      {
        id: "I_1",
        kind: "closed",
        title: "Sample issue",
        body: "Text",
        url: "https://github.com/acme/sample-repo/issues/7",
        createdAt: "2026-10-01T08:00:00Z",
        closedAt: "2026-10-20T15:30:00Z",
        repository: "sample-repo",
        number: 7,
        status: null,
        deadline: null,
      },
    ]);
  });

  it("searches the issues assigned to the user and closed since the given day in the organization", async () => {
    const fetchFn = fakeFetch(page([]));
    await fetchClosedIssues({ ...params, fetchFn });
    expect(requestBody(fetchFn).variables).toEqual({
      search: "is:issue is:closed assignee:@me closed:>=2026-09-26 org:sw-code",
      after: null,
    });
  });

  it("treats a missing body as empty", async () => {
    const fetchFn = fakeFetch(page([{ ...issue, body: null }]));
    const [closed] = await fetchClosedIssues({ ...params, fetchFn });
    expect(closed.body).toBe("");
  });

  it("skips search results that are not issues", async () => {
    const fetchFn = fakeFetch(page([{ __typename: "PullRequest" }, null, issue]));
    expect((await fetchClosedIssues({ ...params, fetchFn })).map((i) => i.id)).toEqual(["I_1"]);
  });

  it("follows pagination until hasNextPage is false", async () => {
    const fetchFn = fakeFetch(page([issue], "CURSOR_1"), page([{ ...issue, id: "I_2" }]));
    const closed = await fetchClosedIssues({ ...params, fetchFn });
    expect(closed.map((i) => i.id)).toEqual(["I_1", "I_2"]);
    expect(requestBody(fetchFn, 1).variables.after).toBe("CURSOR_1");
  });

  it("fails on an error that concerns the whole search", async () => {
    const fetchFn = fakeFetch({
      body: { errors: [{ type: "INSUFFICIENT_SCOPES", message: "Your token has not been granted the required scopes." }] },
    });
    const error = await fetchClosedIssues({ ...params, fetchFn }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GithubError);
    expect((error as GithubError).kind).toBe("insufficient-scopes");
  });
});
