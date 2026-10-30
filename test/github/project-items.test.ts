import { GithubError } from "../../src/github/graphql-client";
import { fetchProjectItems } from "../../src/github/project-items";
import { fakeFetch, requestBody } from "../support/fake-fetch";

const issueContent = {
  __typename: "Issue",
  id: "I_1",
  title: "Sample issue",
  body: "Text",
  url: "https://github.com/acme/sample-repo/issues/7",
  createdAt: "2026-10-12T11:20:38Z",
  number: 7,
  repository: { name: "sample-repo" },
};

const linkedPullRequest = {
  __typename: "PullRequest",
  title: "Sample pull request",
  url: "https://github.com/acme/sample-repo/pull/9",
  number: 9,
  state: "MERGED",
  isDraft: false,
  repository: { name: "sample-repo" },
};

function page(nodes: unknown[], endCursor: string | null = null) {
  return {
    body: {
      data: {
        organization: {
          projectV2: { items: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes } },
        },
      },
    },
  };
}

const params = {
  token: "test-token",
  organization: "sw-code",
  projectNumber: 25,
  query: 'reviewers:@me status:"Waiting for Review"',
  kind: "task" as const,
};

describe("fetchProjectItems", () => {
  it("maps an issue item to a work item", async () => {
    const fetchFn = fakeFetch(
      page([{ status: { name: "In Review", color: "PINK" }, deadline: { date: "2026-10-24" }, content: issueContent }]),
    );
    expect(await fetchProjectItems({ ...params, fetchFn })).toEqual([
      {
        id: "I_1",
        kind: "task",
        title: "Sample issue",
        body: "Text",
        url: "https://github.com/acme/sample-repo/issues/7",
        createdAt: "2026-10-12T11:20:38Z",
        closedAt: null,
        repository: "sample-repo",
        number: 7,
        status: "In Review",
        statusColor: "PINK",
        deadline: "2026-10-24",
        pullRequests: [],
        branches: null,
      },
    ]);
  });

  it("lists the pull requests that mention an issue", async () => {
    const content = { ...issueContent, timelineItems: { nodes: [{ source: linkedPullRequest }] } };
    const fetchFn = fakeFetch(page([{ status: null, deadline: null, content }]));
    const [mapped] = await fetchProjectItems({ ...params, fetchFn });
    expect(mapped.pullRequests).toEqual([
      {
        title: "Sample pull request",
        url: "https://github.com/acme/sample-repo/pull/9",
        number: 9,
        repository: "sample-repo",
        state: "merged",
        closesIssue: false,
      },
    ]);
    expect(requestBody(fetchFn).query).toContain("closedByPullRequestsReferences");
  });

  it("maps a pull request item with the given kind", async () => {
    const fetchFn = fakeFetch(page([{ status: null, deadline: null, content: { ...issueContent, __typename: "PullRequest" } }]));
    const [review] = await fetchProjectItems({ ...params, kind: "review", fetchFn });
    expect(review.kind).toBe("review");
  });

  it("ignores a board color it does not know", async () => {
    const fetchFn = fakeFetch(page([{ status: { name: "Todo", color: "TEAL" }, deadline: null, content: issueContent }]));
    const [mapped] = await fetchProjectItems({ ...params, fetchFn });
    expect(mapped.statusColor).toBeNull();
  });

  it("maps empty field values to null", async () => {
    const fetchFn = fakeFetch(page([{ status: {}, deadline: null, content: issueContent }]));
    const [mapped] = await fetchProjectItems({ ...params, fetchFn });
    expect(mapped.status).toBeNull();
    expect(mapped.statusColor).toBeNull();
    expect(mapped.deadline).toBeNull();
  });

  it("treats a missing body as empty", async () => {
    const fetchFn = fakeFetch(page([{ status: null, deadline: null, content: { ...issueContent, body: null } }]));
    const [mapped] = await fetchProjectItems({ ...params, fetchFn });
    expect(mapped.body).toBe("");
  });

  it("skips draft issues and items without accessible content", async () => {
    const fetchFn = fakeFetch(
      page([
        { status: null, deadline: null, content: { __typename: "DraftIssue" } },
        { status: null, deadline: null, content: null },
      ]),
    );
    expect(await fetchProjectItems({ ...params, fetchFn })).toEqual([]);
  });

  it("keeps the readable items when GitHub hides the content of another item", async () => {
    const response = page([
      { status: null, deadline: null, content: issueContent },
      { status: null, deadline: null, content: null },
    ]);
    const fetchFn = fakeFetch({
      body: {
        ...response.body,
        errors: [
          {
            type: "FORBIDDEN",
            message: "Resource protected by organization SAML enforcement.",
            path: ["organization", "projectV2", "items", "nodes", 1, "content"],
          },
        ],
      },
    });
    expect((await fetchProjectItems({ ...params, fetchFn })).map((i) => i.id)).toEqual(["I_1"]);
  });

  it("still fails on an error that concerns the whole project", async () => {
    const fetchFn = fakeFetch({
      body: {
        data: { organization: { projectV2: null } },
        errors: [{ type: "FORBIDDEN", message: "Resource protected by organization SAML enforcement.", path: ["organization", "projectV2"] }],
      },
    });
    const error = await fetchProjectItems({ ...params, fetchFn }).catch((e: unknown) => e);
    expect((error as GithubError).kind).toBe("sso-required");
  });

  it("follows pagination until hasNextPage is false", async () => {
    const fetchFn = fakeFetch(
      page([{ status: null, deadline: null, content: issueContent }], "CURSOR_1"),
      page([{ status: null, deadline: null, content: { ...issueContent, id: "I_2" } }]),
    );
    const items = await fetchProjectItems({ ...params, fetchFn });
    expect(items.map((i) => i.id)).toEqual(["I_1", "I_2"]);
    expect(requestBody(fetchFn, 1).variables.after).toBe("CURSOR_1");
  });

  it("passes organization, project number and filter as variables", async () => {
    const fetchFn = fakeFetch(page([]));
    await fetchProjectItems({ ...params, fetchFn });
    expect(requestBody(fetchFn).variables).toEqual({
      org: "sw-code",
      number: 25,
      query: 'reviewers:@me status:"Waiting for Review"',
      after: null,
    });
  });

  it("fails with a readable message when the project is not visible", async () => {
    const fetchFn = fakeFetch({ body: { data: { organization: { projectV2: null } } } });
    const error = await fetchProjectItems({ ...params, fetchFn }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GithubError);
    expect((error as GithubError).kind).toBe("other");
    expect((error as GithubError).message).toContain("Projekt 25");
  });
});
