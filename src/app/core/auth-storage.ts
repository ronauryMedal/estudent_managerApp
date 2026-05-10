/** Claves compartidas con `AuthService` e interceptores HTTP (sin inyectar `HttpClient`). */
export const AUTH_TOKEN_KEY = 'sm.access_token';
export const AUTH_USER_KEY = 'sm.user';

/** Normaliza el origen para evitar dobles barras si `apiUrl` termina en `/`. */
export function apiOrigin(url: string): string {
  return url.replace(/\/+$/, '');
}
