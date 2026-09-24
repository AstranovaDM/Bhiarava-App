import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '@bhairava/api-client';

const ACCESS = 'bhairava.access';
const REFRESH = 'bhairava.refresh';

export const secureTokenStore: TokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH),
  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
    else await SecureStore.deleteItemAsync(REFRESH);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
