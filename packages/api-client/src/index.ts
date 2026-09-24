/** Thin API client stub — Wave 2 wires real fetch + auth interceptors. */
export type ApiClientOptions = { baseUrl: string; getAccessToken?: () => string | null | Promise<string | null> };

export function createApiClient(opts: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = opts.getAccessToken ? await opts.getAccessToken() : null;
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(opts.baseUrl.replace(/\/$/, '') + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(method + ' ' + path + ' → ' + res.status + ' ' + text);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    del: <T>(path: string) => request<T>('DELETE', path),
  };
}
