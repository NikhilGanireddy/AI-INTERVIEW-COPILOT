// app/api/voice/stream/route.ts
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Edge-optimized streaming route: no DB imports here.
export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return new Response(JSON.stringify({ error: "Missing ELEVENLABS_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const text = (searchParams.get("text") || "").toString();
    const voiceId = (searchParams.get("voiceId") || "JBFqnCBsd6RMkjVDRZzb").toString();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "eleven_multilingual_v2",
          // Use lower initial bitrate for slightly smaller chunks
          output_format: "mp3_44100_128",
          optimize_streaming_latency: 4,
          text,
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.85,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "ElevenLabs TTS error", details: raw || upstream.statusText }),
        { status: upstream.status || 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Connection", "keep-alive");
    // Stream directly to the browser for immediate playback
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unexpected server error", details: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

