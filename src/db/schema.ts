import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const userSessions = pgTable("user_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const connectedAccounts = pgTable("connected_accounts", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull(), // 'spotify' | 'youtube'
  accountId: text("account_id"), // Spotify user id / YouTube channel id
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  isConnected: boolean("is_connected").default(true).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scopes: text("scopes"),
  product: varchar("product", { length: 40 }), // spotify: free/premium
  country: varchar("country", { length: 8 }),
  followers: integer("followers").default(0).notNull(),
  rawProfile: jsonb("raw_profile"), // JSON cru retornado pela API (ótimo p/ dev)
  syncStatus: varchar("sync_status", { length: 20 }).default("synced").notNull(),
  lastError: text("last_error"),
  itemCount: integer("item_count").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull(), // 'spotify' | 'youtube' | 'hybrid'
  externalId: text("external_id"),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  owner: text("owner"),
  trackCount: integer("track_count").default(0).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  kind: varchar("kind", { length: 30 }).default("user").notNull(), // user | liked | top | recent | uploads | hybrid
  externalUrl: text("external_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  playlistId: integer("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(),
  externalId: text("external_id").notNull(), // Spotify track id ou YouTube videoId
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
  matchSource: varchar("match_source", { length: 20 }), // 'native' | 'auto' | 'manual'
  isLiked: boolean("is_liked").default(false).notNull(),
  playsCount: integer("plays_count").default(0).notNull(),
  position: integer("position").default(0).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  query: text("query").notNull(),
  searchedAt: timestamp("searched_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
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

export type UserSession = typeof userSessions.$inferSelect;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type SearchHistoryItem = typeof searchHistory.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
