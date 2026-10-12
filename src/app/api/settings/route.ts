import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.sessionId, sessionId))
      .limit(1);

    const settings = rows[0] || {
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID || "",
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ? "••••••••" : "",
      youtubeApiKey: process.env.YOUTUBE_API_KEY ? "••••••••" : "",
      autoMatchYoutube: true,
      defaultAudioQuality: "high",
    };

    return NextResponse.json({
      success: true,
      settings: {
        autoMatchYoutube: settings.autoMatchYoutube ?? true,
        defaultAudioQuality: settings.defaultAudioQuality ?? "high",
        hasEnvSpotify: Boolean(process.env.SPOTIFY_CLIENT_ID),
        hasEnvGoogle: Boolean(process.env.GOOGLE_CLIENT_ID),
        hasEnvYouTubeKey: Boolean(process.env.YOUTUBE_API_KEY),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();

    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(appSettings)
        .set({
          autoMatchYoutube: body.autoMatchYoutube ?? true,
          defaultAudioQuality: body.defaultAudioQuality || "high",
        })
        .where(eq(appSettings.sessionId, sessionId));
    } else {
      await db.insert(appSettings).values({
        sessionId,
        autoMatchYoutube: body.autoMatchYoutube ?? true,
        defaultAudioQuality: body.defaultAudioQuality || "high",
      });
    }

    return NextResponse.json({ success: true, message: "Configurações salvas!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
