CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"spotify_client_id" text,
	"spotify_client_secret" text,
	"google_client_id" text,
	"google_client_secret" text,
	"youtube_api_key" text,
	"auto_match_youtube" boolean DEFAULT true NOT NULL,
	"default_audio_quality" varchar(20) DEFAULT 'high' NOT NULL,
	"dev_mode" boolean DEFAULT true NOT NULL,
	CONSTRAINT "app_settings_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"account_id" text,
	"display_name" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"is_connected" boolean DEFAULT true NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" text,
	"product" varchar(40),
	"country" varchar(8),
	"followers" integer DEFAULT 0 NOT NULL,
	"raw_profile" jsonb,
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_error" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connected_accounts_platform_check" CHECK ("connected_accounts"."platform" in ('spotify', 'youtube')),
	CONSTRAINT "connected_accounts_sync_status_check" CHECK ("connected_accounts"."sync_status" in ('pending', 'syncing', 'synced', 'error')),
	CONSTRAINT "connected_accounts_item_count_check" CHECK ("connected_accounts"."item_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"cover_url" text,
	"owner" text,
	"track_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"kind" varchar(30) DEFAULT 'user' NOT NULL,
	"external_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlists_platform_check" CHECK ("playlists"."platform" in ('spotify', 'youtube', 'hybrid')),
	CONSTRAINT "playlists_kind_check" CHECK ("playlists"."kind" in ('user', 'liked', 'top', 'recent', 'uploads', 'hybrid')),
	CONSTRAINT "playlists_track_count_check" CHECK ("playlists"."track_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"query" text NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"playlist_id" integer,
	"platform" varchar(20) NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text,
	"preview_url" text,
	"youtube_video_id" text,
	"spotify_uri" text,
	"external_url" text,
	"explicit" boolean DEFAULT false NOT NULL,
	"match_source" varchar(20),
	"is_liked" boolean DEFAULT false NOT NULL,
	"plays_count" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_platform_check" CHECK ("tracks"."platform" in ('spotify', 'youtube')),
	CONSTRAINT "tracks_duration_check" CHECK ("tracks"."duration_seconds" >= 0),
	CONSTRAINT "tracks_plays_count_check" CHECK ("tracks"."plays_count" >= 0),
	CONSTRAINT "tracks_match_source_check" CHECK ("tracks"."match_source" is null or "tracks"."match_source" in ('native', 'auto', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connected_accounts_session_platform_uidx" ON "connected_accounts" USING btree ("session_id","platform");--> statement-breakpoint
CREATE INDEX "connected_accounts_platform_account_idx" ON "connected_accounts" USING btree ("platform","account_id");--> statement-breakpoint
CREATE INDEX "playlists_session_platform_created_idx" ON "playlists" USING btree ("session_id","platform","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_session_platform_external_uidx" ON "playlists" USING btree ("session_id","platform","external_id") WHERE "playlists"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "search_history_session_searched_idx" ON "search_history" USING btree ("session_id","searched_at");--> statement-breakpoint
CREATE INDEX "tracks_session_platform_idx" ON "tracks" USING btree ("session_id","platform");--> statement-breakpoint
CREATE INDEX "tracks_playlist_position_idx" ON "tracks" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE INDEX "tracks_session_liked_idx" ON "tracks" USING btree ("session_id","is_liked");--> statement-breakpoint
CREATE INDEX "tracks_session_external_idx" ON "tracks" USING btree ("session_id","platform","external_id");--> statement-breakpoint
CREATE INDEX "user_sessions_updated_at_idx" ON "user_sessions" USING btree ("updated_at");