import { toLinkedPullRequests } from "../../src/github/linked-pull-requests";

type State = "OPEN" | "CLOSED" | "MERGED";

function pullRequest(number: number, overrides: { state?: State; isDraft?: boolean } = {}) {
  return {
    __typename: "PullRequest",
    title: `Sample pull request ${number}`,
    url: `https://github.com/acme/sample-repo/pull/${number}`,
    number,
    state: "OPEN" as State,
    isDraft: false,
    repository: { name: "sample-repo" },
    ...overrides,
  };
}

function mentionedBy(source: { __typename: string } | null) {
  return { source };
}

describe("toLinkedPullRequests", () => {
  it("lists the closing pull requests before the mentioning ones", () => {
    const linked = toLinkedPullRequests({
      closedByPullRequestsReferences: { nodes: [pullRequest(2)] },
      timelineItems: { nodes: [mentionedBy(pullRequest(1))] },
    });
    expect(linked).toEqual([
      {
        title: "Sample pull request 2",
        url: "https://github.com/acme/sample-repo/pull/2",
        number: 2,
        repository: "sample-repo",
        state: "open",
        closesIssue: true,
      },
      {
        title: "Sample pull request 1",
        url: "https://github.com/acme/sample-repo/pull/1",
        number: 1,
        repository: "sample-repo",
        state: "open",
        closesIssue: false,
      },
    ]);
  });

  it("names drafts, merged and closed pull requests", () => {
    const linked = toLinkedPullRequests({
      timelineItems: {
        nodes: [
          mentionedBy(pullRequest(1, { isDraft: true })),
          mentionedBy(pullRequest(2, { state: "MERGED" })),
          mentionedBy(pullRequest(3, { state: "CLOSED", isDraft: true })),
        ],
      },
    });
    expect(linked.map((pr) => pr.state)).toEqual(["draft", "merged", "closed"]);
  });

  it("lists a pull request that closes and mentions the issue once", () => {
    const linked = toLinkedPullRequests({
      closedByPullRequestsReferences: { nodes: [pullRequest(1)] },
      timelineItems: { nodes: [mentionedBy(pullRequest(1)), mentionedBy(pullRequest(1))] },
    });
    expect(linked).toHaveLength(1);
    expect(linked[0].closesIssue).toBe(true);
  });

  it("skips mentions from issues and hidden sources", () => {
    const linked = toLinkedPullRequests({
      closedByPullRequestsReferences: { nodes: [null] },
      timelineItems: { nodes: [mentionedBy({ __typename: "Issue" }), mentionedBy(null), {}, null] },
    });
    expect(linked).toEqual([]);
  });

  it("has nothing for content without links", () => {
    expect(toLinkedPullRequests({})).toEqual([]);
  });
});
