import { mergeProgress } from "../../src/domain/merge-progress";
import type { LinkedPullRequest, PullRequestState } from "../../src/domain/work-item";

function pullRequests(...states: PullRequestState[]): LinkedPullRequest[] {
  return states.map((state, index) => ({
    title: `Sample ${index}`,
    url: `https://github.com/acme/sample-repo/pull/${index}`,
    number: index,
    repository: "sample-repo",
    state,
    closesIssue: false,
  }));
}

describe("mergeProgress", () => {
  it("has nothing to say while no pull request is merged", () => {
    expect(mergeProgress(pullRequests())).toBeNull();
    expect(mergeProgress(pullRequests("open", "draft"))).toBeNull();
  });

  it("counts the merged pull requests", () => {
    expect(mergeProgress(pullRequests("merged", "open", "draft"))).toEqual({ merged: 1, total: 3, complete: false });
  });

  it("is complete when every pull request is merged", () => {
    expect(mergeProgress(pullRequests("merged", "merged"))).toEqual({ merged: 2, total: 2, complete: true });
  });

  it("leaves out pull requests closed without merging", () => {
    expect(mergeProgress(pullRequests("merged", "closed"))).toEqual({ merged: 1, total: 1, complete: true });
  });
});
