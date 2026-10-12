import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

/** Valores oficiais usados pelo app e pelos checks do PostgreSQL. */
export const accountPlatforms = ["spotify", "youtube"] as const;
export const playlistPlatforms = ["spotify", "youtube", "hybrid"] as const;
export const playlistKinds = ["user", "liked", "top", "recent", "uploads", "hybrid"] as const;
export const syncStatuses = ["pending", "syncing", "synced", "error"] as const;
export const matchSources = ["native", "auto", "manual"] as const;
export const userRoles = ["dev", "user"] as const;

export type AccountPlatform = (typeof accountPlatforms)[number];
export type PlaylistPlatform = (typeof playlistPlatforms)[number];
export type PlaylistKind = (typeof playlistKinds)[number];
export type SyncStatus = (typeof syncStatuses)[number];
export type MatchSource = (typeof matchSources)[number];
export type UserRole = (typeof userRoles)[number];

/** Contas do DualWave (login com e-mail + senha, salvo no servidor). */
export const appUsers = pgTable(
  "app_users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: varchar("role", { length: 10 }).default("user").notNull(), // 'dev' | 'user'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("app_users_role_check", sql`${table.role} in ('dev', 'user')`)]
);

/** Sessões de login do DualWave (cookie dw_auth → usuário). */
export const authSessions = pgTable(
  "auth_sessions",
  {
    token: varchar("token", { length: 128 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)]
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    // Quando a sessão de música pertence a um usuário logado (id "u_<userId>").
    userId: integer("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_sessions_updated_at_idx").on(table.updatedAt),
    uniqueIndex("user_sessions_user_id_uidx")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
  ]
);

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(), // spotify | youtube
    accountId: text("account_id"), // Spotify user ID / YouTube channel ID
    displayName: text("display_name").notNull(),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    isConnected: boolean("is_connected").default(true).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    product: varchar("product", { length: 40 }), // Spotify: free/premium
    country: varchar("country", { length: 8 }),
    followers: integer("followers").default(0).notNull(),
    rawProfile: jsonb("raw_profile"),
    syncStatus: varchar("sync_status", { length: 20 }).default("synced").notNull(),
    lastError: text("last_error"),
    itemCount: integer("item_count").default(0).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("connected_accounts_session_platform_uidx").on(table.sessionId, table.platform),
    index("connected_accounts_platform_account_idx").on(table.platform, table.accountId),
    check("connected_accounts_platform_check", sql`${table.platform} in ('spotify', 'youtube')`),
    check(
      "connected_accounts_sync_status_check",
      sql`${table.syncStatus} in ('pending', 'syncing', 'synced', 'error')`
    ),
    check("connected_accounts_item_count_check", sql`${table.itemCount} >= 0`),
  ]
);

export const playlists = pgTable(
  "playlists",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(), // spotify | youtube | hybrid
    externalId: text("external_id"),
    title: text("title").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    owner: text("owner"),
    trackCount: integer("track_count").default(0).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    kind: varchar("kind", { length: 30 }).default("user").notNull(),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("playlists_session_platform_created_idx").on(
      table.sessionId,
      table.platform,
      table.createdAt
    ),
    uniqueIndex("playlists_session_platform_external_uidx")
      .on(table.sessionId, table.platform, table.externalId)
      .where(sql`${table.externalId} is not null`),
    check("playlists_platform_check", sql`${table.platform} in ('spotify', 'youtube', 'hybrid')`),
    check(
      "playlists_kind_check",
      sql`${table.kind} in ('user', 'liked', 'top', 'recent', 'uploads', 'hybrid')`
    ),
    check("playlists_track_count_check", sql`${table.trackCount} >= 0`),
  ]
);

export const tracks = pgTable(
  "tracks",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    playlistId: integer("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(), // spotify | youtube
    externalId: text("external_id").notNull(), // Spotify track ID or YouTube video ID
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),
    youtubeVideoId: text("youtube_video_id"),
    spotifyUri: text("spotify_uri"),
    externalUrl: text("external_url"),
    explicit: boolean("explicit").default(false).notNull(),
    matchSource: varchar("match_source", { length: 20 }), // native | auto | manual
    isLiked: boolean("is_liked").default(false).notNull(),
    playsCount: integer("plays_count").default(0).notNull(),
    position: integer("position").default(0).notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tracks_session_platform_idx").on(table.sessionId, table.platform),
    index("tracks_playlist_position_idx").on(table.playlistId, table.position),
    index("tracks_session_liked_idx").on(table.sessionId, table.isLiked),
    index("tracks_session_external_idx").on(table.sessionId, table.platform, table.externalId),
    check("tracks_platform_check", sql`${table.platform} in ('spotify', 'youtube')`),
    check("tracks_duration_check", sql`${table.durationSeconds} >= 0`),
    check("tracks_plays_count_check", sql`${table.playsCount} >= 0`),
    check(
      "tracks_match_source_check",
      sql`${table.matchSource} is null or ${table.matchSource} in ('native', 'auto', 'manual')`
    ),
  ]
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    searchedAt: timestamp("searched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("search_history_session_searched_idx").on(table.sessionId, table.searchedAt)]
);

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  // A linha global do Console Dev usa __dev_console__; não deve ter FK de sessão.
  sessionId: varchar("session_id", { length: 64 }).notNull().unique(),
  spotifyClientId: text("spotify_client_id"),
  spotifyClientSecret: text("spotify_client_secret"),
  googleClientId: text("google_client_id"),
  googleClientSecret: text("google_client_secret"),
  youtubeApiKey: text("youtube_api_key"),
  autoMatchYoutube: boolean("auto_match_youtube").default(true).notNull(),
  defaultAudioQuality: varchar("default_audio_quality", { length: 20 }).default("high").notNull(),
  devMode: boolean("dev_mode").default(true).notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type SearchHistoryItem = typeof searchHistory.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
