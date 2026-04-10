// In-memory token holder. The auth store is the source of truth (and
// persists tokens to localStorage), but the axios request interceptor in
// client.ts can't import the store without creating a circular dep:
//
//   client.ts -> store/auth.ts -> api/auth.ts -> client.ts
//
// Instead, the store pushes the current access token into this tiny module
// after every login/logout/rehydrate, and the interceptor reads it.

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}
