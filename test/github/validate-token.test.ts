import { GithubError } from "../../src/github/graphql-client";
import { validateToken } from "../../src/github/validate-token";
import { accessWith, fakeFetch, type FakeResponse } from "../support/fake-fetch";

function userResponse(scopes?: string): FakeResponse {
  const headers: Record<string, string> = scopes === undefined ? {} : { "x-oauth-scopes": scopes };
  return { body: { login: "octocat" }, headers };
}

describe("validateToken", () => {
  it("asks GitHub who the token belongs to", async () => {
    const fetchFn = fakeFetch(userResponse("repo, read:org, read:project"));
    await validateToken(accessWith(fetchFn));
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.github.com/user");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("returns the login and no missing scopes for a complete classic token", async () => {
    const fetchFn = fakeFetch(userResponse("repo, read:org, read:project"));
    expect(await validateToken(accessWith(fetchFn))).toEqual({ login: "octocat", missingScopes: [] });
  });

  it("lists missing scopes", async () => {
    const fetchFn = fakeFetch(userResponse("repo, write:packages"));
    expect((await validateToken(accessWith(fetchFn))).missingScopes).toEqual(["read:org", "read:project"]);
  });

  it("accepts broader scopes that include the required ones", async () => {
    const fetchFn = fakeFetch(userResponse("repo, admin:org, project"));
    expect((await validateToken(accessWith(fetchFn))).missingScopes).toEqual([]);
  });

  it("reports unknown scopes when the header is absent", async () => {
    const fetchFn = fakeFetch(userResponse());
    expect((await validateToken(accessWith(fetchFn))).missingScopes).toBeNull();
  });

  it("names the configured organization when SSO is missing", async () => {
    const fetchFn = fakeFetch({ status: 403, headers: { "x-github-sso": "required" } });
    const error = await validateToken(accessWith(fetchFn, "example-org")).catch((e: unknown) => e);
    expect((error as GithubError).kind).toBe("sso-required");
    expect((error as GithubError).message).toBe("Token ist nicht für example-org freigegeben (Configure SSO).");
  });

  it("rejects an invalid token as unauthorized", async () => {
    const error = await validateToken(accessWith(fakeFetch({ status: 401 }))).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GithubError);
    expect((error as GithubError).kind).toBe("unauthorized");
  });
});
