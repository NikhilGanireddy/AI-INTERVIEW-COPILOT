import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing DEEPGRAM_API_KEY" }, { status: 500 });
  try {
    const r = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      // body: JSON.stringify({ ttl_seconds: 300 }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json({ error: text || "token_error" }, { status: 500 });
    }
    const data = await r.json(); // { access_token, expires_in }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

