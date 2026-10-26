export type FetchFn = typeof fetch;

export interface GithubAccess {
  token: string;
  organization: string;
  fetchFn: FetchFn;
}

export type GithubErrorKind = "unauthorized" | "insufficient-scopes" | "sso-required" | "network" | "other";

export class GithubError extends Error {
  constructor(
    readonly kind: GithubErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GithubError";
  }
}

export const GITHUB_API = "https://api.github.com";

const MESSAGES = {
  unauthorized: "Token ungültig oder abgelaufen.",
  insufficientScopes: "Dem Token fehlen Berechtigungen (repo, read:org, read:project).",
  ssoRequired: (organization: string) => `Token ist nicht für ${organization} freigegeben (Configure SSO).`,
  network: "GitHub nicht erreichbar.",
};

export interface GraphqlError {
  type?: string;
  message: string;
  path?: (string | number)[];
}

export async function requestGithub(access: GithubAccess, url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await access.fetchFn(url, init);
  } catch {
    throw new GithubError("network", MESSAGES.network);
  }
  if (response.status === 401) throw new GithubError("unauthorized", MESSAGES.unauthorized);
  if (response.status === 403 && response.headers.has("x-github-sso")) {
    throw new GithubError("sso-required", MESSAGES.ssoRequired(access.organization));
  }
  if (!response.ok) throw new GithubError("other", `GitHub antwortet mit Status ${response.status}.`);
  return response;
}

function errorFromGraphql(errors: GraphqlError[], organization: string): GithubError {
  if (errors.some((error) => error.type === "INSUFFICIENT_SCOPES")) {
    return new GithubError("insufficient-scopes", MESSAGES.insufficientScopes);
  }
  if (errors.some((error) => error.message.includes("SAML"))) {
    return new GithubError("sso-required", MESSAGES.ssoRequired(organization));
  }
  return new GithubError("other", errors.map((error) => error.message).join(" "));
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
}

export async function postGraphql<T>(
  access: GithubAccess,
  query: string,
  variables: Record<string, unknown>,
  isIgnorable: (error: GraphqlError) => boolean = () => false,
): Promise<T> {
  const response = await requestGithub(access, `${GITHUB_API}/graphql`, {
    method: "POST",
    headers: { ...authHeaders(access.token), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as { data?: T; errors?: GraphqlError[] };
  const errors = payload.errors ?? [];
  if (errors.length && (!payload.data || !errors.every(isIgnorable))) throw errorFromGraphql(errors, access.organization);
  return payload.data as T;
}
