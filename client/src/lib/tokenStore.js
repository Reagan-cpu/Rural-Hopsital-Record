/**
 * Simple token cache to avoid calling supabase.auth.getSession() on every API request.
 * AuthContext writes to this store, apiFetch reads from it.
 * Avoids circular dependency and reduces async overhead.
 */

let cachedToken = null;

export function setToken(token) {
  cachedToken = token;
}

export function getToken() {
  return cachedToken;
}

export function clearToken() {
  cachedToken = null;
}
