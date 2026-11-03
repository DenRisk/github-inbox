import { describe, expect, it } from "vitest";
import { linkCaption } from "../../src/popup/link-caption";

describe("linkCaption", () => {
  it("names an organization board by its project number", () => {
    expect(linkCaption("https://github.com/orgs/acme/projects/25/views/3")).toBe("Projekt 25");
  });

  it("names a personal board by its project number", () => {
    expect(linkCaption("https://github.com/users/someone/projects/7")).toBe("Projekt 7");
  });

  it("names a repository by owner and name", () => {
    expect(linkCaption("https://github.com/acme/sample-repo/pulls")).toBe("acme/sample-repo");
  });

  it("falls back to the host for other pages", () => {
    expect(linkCaption("https://example.com/board")).toBe("example.com");
  });

  it("falls back to the host for a GitHub page without a repository", () => {
    expect(linkCaption("https://github.com/acme")).toBe("github.com");
  });

  it("returns nothing for an address it cannot read", () => {
    expect(linkCaption("kein link")).toBe("");
  });
});
