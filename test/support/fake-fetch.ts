import type { Mock } from "vitest";
import type { FetchFn, GithubAccess } from "../../src/github/graphql-client";

export interface FakeResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export function toResponse({ status = 200, headers = {}, body = {} }: FakeResponse): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export function fakeFetch(...responses: FakeResponse[]): Mock<FetchFn> {
  const queue = [...responses];
  return vi.fn<FetchFn>(async () => toResponse(queue.length > 1 ? queue.shift()! : queue[0]));
}

export function requestBody(fetchFn: Mock<FetchFn>, call = 0): { query: string; variables: Record<string, unknown> } {
  return JSON.parse(fetchFn.mock.calls[call][1]!.body as string);
}

export function accessWith(fetchFn: FetchFn, organization = "acme"): GithubAccess {
  return { token: "test-token", organization, fetchFn };
}
