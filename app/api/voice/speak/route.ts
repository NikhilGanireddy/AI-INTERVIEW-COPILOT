// app/api/voice/speak/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { VoiceProfile } from "@/lib/models/VoiceProfile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text as string | undefined)?.toString() ?? "";
    let voiceId = (body?.voiceId as string | undefined)?.toString();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Fallback to the user's latest saved voice if voiceId not provided
    if (!voiceId) {
      await connectDB();
      const latest = (await VoiceProfile.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean()) as unknown as { elevenVoiceId?: string } | null;
      if (latest?.elevenVoiceId) {
        voiceId = latest.elevenVoiceId;
      } else {
        // Default to a pre-made voice if user has no saved voices
        voiceId = "JBFqnCBsd6RMkjVDRZzb"; // Rachel (example from docs)
      }
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
          output_format: "mp3_44100_128",
          // Reduce time-to-first-byte from ElevenLabs streaming
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
      let details: unknown = raw;
      try {
        details = JSON.parse(raw);
      } catch {}
      return NextResponse.json(
        { error: "ElevenLabs TTS error", details },
        { status: upstream.status || 502 }
      );
    }

    // Proxy the audio stream to the client
    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Connection", "keep-alive");
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("TTS route failed", error);
    return NextResponse.json(
      { error: "Unexpected server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
