// app/api/voice/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { VoiceProfile } from "@/lib/models/VoiceProfile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();

    // Accept either "files" (multiple) or single "file"
    const uploadedFiles = [
      ...form.getAll("files").filter((f): f is File => f instanceof File),
    ];
    const single = form.get("file");
    if (single instanceof File) uploadedFiles.push(single);

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Missing file", details: "Provide at least one audio sample" },
        { status: 400 }
      );
    }

    const rawName = form.get("name");
    const nameFromRequest =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : "My Voice";

    const user = await currentUser();
    const profileUserName =
      user?.fullName?.trim() ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress ||
      "Unknown";
    const resolvedName = nameFromRequest;

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    // Optional flags passed through if present
    const removeNoiseRaw = form.get("remove_background_noise");
    const descriptionRaw = form.get("description");
    const labelsRaw = form.get("labels");

    // Build multipart form-data exactly as ElevenLabs expects
    const fd = new FormData();
    fd.set("name", resolvedName);
    if (typeof removeNoiseRaw === "string" && removeNoiseRaw.trim().length > 0) {
      fd.set("remove_background_noise", removeNoiseRaw.trim());
    }
    if (typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0) {
      fd.set("description", descriptionRaw.trim());
    }
    if (typeof labelsRaw === "string" && labelsRaw.trim().length > 0) {
      fd.set("labels", labelsRaw.trim());
    }

    // Append each file under the field name "files" (per ElevenLabs docs)
    for (const f of uploadedFiles) {
      // Preserve filename and content type
      const filename = f.name || "sample.mp3";
      fd.append("files", f, filename);
    }

    let elevenRes: Response;
    try {
      elevenRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: {
          // Do NOT set Content-Type manually; let fetch add the multipart boundary
          "xi-api-key": elevenKey,
          Accept: "application/json",
        },
        body: fd,
      });
    } catch (error) {
      console.error("Failed to reach ElevenLabs", error);
      return NextResponse.json(
        { error: "Failed to reach ElevenLabs", details: (error as Error).message },
        { status: 502 }
      );
    }

    if (!elevenRes.ok) {
      const raw = await elevenRes.text();
      let details: unknown = raw;
      try {
        details = JSON.parse(raw);
      } catch {
        // keep raw text
      }
      console.error("ElevenLabs upload failed", elevenRes.status, details);
      return NextResponse.json(
        { error: "ElevenLabs error", details },
        { status: elevenRes.status || 502 }
      );
    }

    const data = await elevenRes.json(); // { voice_id, requires_verification }
    await connectDB();
    await VoiceProfile.create({
      userId,
      userName: profileUserName,
      elevenVoiceId: data.voice_id,
      name: resolvedName,
    });

    return NextResponse.json({
      ok: true,
      voiceId: data.voice_id,
      requiresVerification: data.requires_verification,
    });
  } catch (error) {
    console.error("Voice clone route failed", error);
    return NextResponse.json(
      { error: "Unexpected server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
