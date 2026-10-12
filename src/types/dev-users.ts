/** Dados públicos do painel de sessões dev. Nunca incluir tokens ou hashes aqui. */
export interface LoggedInDeveloper {
  id: number;
  displayName: string;
  email: string;
  role: "dev";
  activeSessions: number;
  lastLoginAt: string;
  lastSeenAt: string;
  expiresAt: string;
  recentlyActive: boolean;
  isCurrentUser: boolean;
}

export interface DevUsersResponse {
  success: true;
  users: LoggedInDeveloper[];
  totals: {
    developers: number;
    sessions: number;
    recentlyActive: number;
  };
  viewer: { id: number; displayName: string };
  checkedAt: string;
  recentActivityWindowMinutes: number;
}
