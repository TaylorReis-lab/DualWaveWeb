import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "duo_music_session";

export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }
  // Generate random id
  const newId = "usr_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  cookieStore.set(SESSION_COOKIE_NAME, newId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // Accessible to client if needed
    sameSite: "lax",
  });
  return newId;
}
