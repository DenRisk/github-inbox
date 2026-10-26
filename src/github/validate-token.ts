import { authHeaders, GITHUB_API, requestGithub, type GithubAccess } from "./graphql-client";

export const REQUIRED_SCOPES = ["repo", "read:org", "read:project"] as const;

const SCOPES_IMPLYING: Record<(typeof REQUIRED_SCOPES)[number], string[]> = {
  repo: ["repo"],
  "read:org": ["read:org", "write:org", "admin:org"],
  "read:project": ["read:project", "project"],
};

function missingFrom(grantedHeader: string): string[] {
  const granted = new Set(grantedHeader.split(",").map((scope) => scope.trim()));
  return REQUIRED_SCOPES.filter((required) => !SCOPES_IMPLYING[required].some((scope) => granted.has(scope)));
}

export async function validateToken(access: GithubAccess): Promise<{ login: string; missingScopes: string[] | null }> {
  const response = await requestGithub(access, `${GITHUB_API}/user`, { headers: authHeaders(access.token) });
  const { login } = (await response.json()) as { login: string };
  const grantedHeader = response.headers.get("x-oauth-scopes");
  return { login, missingScopes: grantedHeader === null ? null : missingFrom(grantedHeader) };
}
