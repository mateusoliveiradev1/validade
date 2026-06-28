export type WebFetcher = typeof fetch;

export function createAuthenticatedFetcher(
  sessionToken: string | undefined,
  baseFetch: WebFetcher = fetch,
): WebFetcher {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const token = sessionToken?.trim();

    if (token === undefined || token.length === 0) {
      return baseFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }

    if (input instanceof Request) {
      return baseFetch(new Request(input, { ...init, headers }));
    }

    return baseFetch(input, { ...init, headers });
  };
}
