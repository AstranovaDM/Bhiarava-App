/** Vite base path without trailing slash, e.g. /app/admin */
export const APP_BASE = String(((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL) || '/').replace(/\/$/, '') || '';

export function appPath(path: string): string {
  const p = path.startsWith('/') ? path : '/' + path;
  return APP_BASE ? APP_BASE + p : p;
}

export function isAppLoginPath(pathname: string): boolean {
  return pathname === appPath('/login') || pathname === '/login' || pathname.endsWith('/login');
}
