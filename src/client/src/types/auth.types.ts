export interface AuthUser {
  id: string;
  email: string;
  /** Null for accounts created before names were collected. */
  name: string | null;
  currencyCode: string;
  /** API path (relative to the API base) of the cached profile photo; null when there is none. */
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}
