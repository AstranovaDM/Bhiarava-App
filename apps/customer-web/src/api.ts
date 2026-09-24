import { createApiClient, createMemoryTokenStore } from '@bhairava/api-client';

export const tokens = createMemoryTokenStore();
export const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || '',
  tokens,
  onUnauthorized: () => {
    void tokens.clear();
    if (location.pathname !== '/login') location.href = '/login';
  },
});
