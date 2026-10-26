import { GithubError, postGraphql } from "../../src/github/graphql-client";
import { accessWith, fakeFetch, type FakeResponse } from "../support/fake-fetch";

describe("postGraphql", () => {
  it("sends the token as a bearer header to the GraphQL endpoint", async () => {
    const fetchFn = fakeFetch({ body: { data: {} } });
    await postGraphql(accessWith(fetchFn), "query { viewer { login } }", { a: 1 });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.github.com/graphql");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init?.body as string)).toEqual({ query: "query { viewer { login } }", variables: { a: 1 } });
  });

  it("returns data on success", async () => {
    const fetchFn = fakeFetch({ body: { data: { viewer: { login: "octocat" } } } });
    expect(await postGraphql(accessWith(fetchFn), "q", {})).toEqual({ viewer: { login: "octocat" } });
  });

  it.each<[string, FakeResponse, string]>([
    ["status 401", { status: 401 }, "unauthorized"],
    [
      "status 403 with x-github-sso header",
      { status: 403, headers: { "x-github-sso": "required; url=https://github.com/orgs/sw-code/sso" } },
      "sso-required",
    ],
    [
      "INSUFFICIENT_SCOPES error",
      { body: { errors: [{ type: "INSUFFICIENT_SCOPES", message: "needs read:project" }] } },
      "insufficient-scopes",
    ],
    [
      "SAML message",
      { body: { errors: [{ type: "FORBIDDEN", message: "Resource protected by organization SAML enforcement." }] } },
      "sso-required",
    ],
    ["any other error", { body: { errors: [{ type: "SOMETHING", message: "boom" }] } }, "other"],
    ["status 500", { status: 500 }, "other"],
  ])("classifies %s", async (_, response, kind) => {
    const error = await postGraphql(accessWith(fakeFetch(response)), "q", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GithubError);
    expect((error as GithubError).kind).toBe(kind);
  });

  it.each<[string, FakeResponse]>([
    ["status 403 with x-github-sso header", { status: 403, headers: { "x-github-sso": "required" } }],
    ["SAML message", { body: { errors: [{ type: "FORBIDDEN", message: "Resource protected by organization SAML enforcement." }] } }],
  ])("names the configured organization in the SSO message for %s", async (_, response) => {
    const error = await postGraphql(accessWith(fakeFetch(response), "example-org"), "q", {}).catch((e: unknown) => e);
    expect((error as GithubError).message).toBe("Token ist nicht für example-org freigegeben (Configure SSO).");
  });

  it("classifies a rejected fetch as network", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const error = await postGraphql(accessWith(fetchFn), "q", {}).catch((e: unknown) => e);
    expect((error as GithubError).kind).toBe("network");
  });
});
