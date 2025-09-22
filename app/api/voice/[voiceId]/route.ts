// app/api/voice/[voiceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { VoiceProfile } from "@/lib/models/VoiceProfile";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const { voiceId } = await params;
    if (!voiceId) {
      return NextResponse.json({ error: "Missing voiceId" }, { status: 400 });
    }

    await connectDB();
    const doc = await VoiceProfile.findOne({ userId, elevenVoiceId: voiceId });
    if (!doc) {
      return NextResponse.json({ error: "Voice not found" }, { status: 404 });
    }

    // Try deleting from ElevenLabs first
    let upstreamStatus = 200;
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": elevenKey,
          Accept: "application/json",
        },
      });
      upstreamStatus = res.status;
      if (!res.ok && res.status !== 404) {
        const raw = await res.text();
        let details: unknown = raw;
        try {
          details = JSON.parse(raw);
        } catch {}
        return NextResponse.json(
          { error: "Failed to delete on ElevenLabs", details },
          { status: res.status || 502 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to reach ElevenLabs", details: (error as Error).message },
        { status: 502 }
      );
    }

    // Remove from our DB regardless (even if ElevenLabs already 404s it)
    await VoiceProfile.deleteOne({ _id: doc._id });

    return NextResponse.json({ ok: true, upstreamStatus });
  } catch (error) {
    console.error("Delete voice route failed", error);
    return NextResponse.json(
      { error: "Unexpected server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const { voiceId } = await params;
    if (!voiceId) {
      return NextResponse.json({ error: "Missing voiceId" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const rawName = (typeof body === "object" && body && (body as { name?: unknown }).name && typeof (body as { name?: unknown }).name === "string"
      ? ((body as { name: string }).name)
      : "");
    const newName = rawName.trim();
    if (!newName) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    await connectDB();
    const doc = await VoiceProfile.findOne({ userId, elevenVoiceId: voiceId });
    if (!doc) {
      return NextResponse.json({ error: "Voice not found" }, { status: 404 });
    }

    // Best-effort upstream rename (ignore failures, keep DB in sync)
    let upstreamStatus: number | null = null;
    if (elevenKey) {
      try {
        const fd = new FormData();
        fd.set("name", newName);
        const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}/edit`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
          },
          body: fd,
        });
        upstreamStatus = res.status;
      } catch {
        upstreamStatus = null;
      }
    }

    doc.name = newName;
    await doc.save();

    return NextResponse.json({ ok: true, upstreamStatus, name: newName });
  } catch (error) {
    console.error("Update voice route failed", error);
    return NextResponse.json(
      { error: "Unexpected server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
