import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@deepgram/sdk";

export const runtime = "nodejs";

// Returns a short-lived Deepgram access token for the authenticated user.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing DEEPGRAM_API_KEY" }, { status: 500 });

  try {
    const dg = createClient(key);
    // Default TTL 300s; adjust as needed (1-3600 allowed by SDK types)
    const { result, error } = await dg.auth.grantToken({ ttl_seconds: 300 });
    if (error || !result) {
      let status = 502;
      let msg = "Failed to grant token";
      const e = error as unknown;
      if (typeof e === "object" && e !== null) {
        const s = (e as { status?: unknown }).status;
        const m = (e as { message?: unknown }).message;
        if (typeof s === "number") status = s;
        if (typeof m === "string") msg = m;
      }
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ token: result.access_token, expiresIn: result.expires_in });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
