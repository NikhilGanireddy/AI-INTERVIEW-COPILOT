import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic validation: allow http/https urls
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only http/https urls supported" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream proxy to bypass browser CORS for remote audio sources.
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Upstream fetch failed", details: raw || upstream.statusText }), {
        status: upstream.status || 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headers = new Headers();
    // Pass through content type if present; default to generic audio
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "audio/*");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

