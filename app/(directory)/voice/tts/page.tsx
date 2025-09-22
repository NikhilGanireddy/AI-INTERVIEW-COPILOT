import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { VoiceProfile } from "@/lib/models/VoiceProfile";
import TTSForm from "./tts-form";

export default async function TTSPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  let voices: Array<{ name?: string; elevenVoiceId: string }> = [];
  if (userId) {
    await connectDB();
    voices = ((await VoiceProfile.find({ userId })
      .sort({ createdAt: -1 })
      .lean()) as unknown) as Array<{ name?: string; elevenVoiceId: string }>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Text to Speech</h1>
        <p className="text-muted-foreground">
          Type text, pick a voice, and stream the audio instantly.
        </p>
      </div>
      <TTSForm voices={voices.map(v => ({ name: v.name, id: v.elevenVoiceId }))} />
    </div>
  );
}
