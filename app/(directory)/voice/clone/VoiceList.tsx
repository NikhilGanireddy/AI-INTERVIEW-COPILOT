import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { VoiceProfile } from "@/lib/models/VoiceProfile";
import DeleteVoiceButton from "@/components/voice/DeleteVoiceButton";
import EditVoiceName from "@/components/voice/EditVoiceName";

export default async function VoiceList() {
  const { userId } = await auth();
  if (!userId) return null;

  await connectDB();
  const voices = ((await VoiceProfile.find({ userId })
    .sort({ createdAt: -1 })
    .lean()) as unknown) as Array<{
      _id: unknown;
      name?: string;
      createdAt: string | Date;
      elevenVoiceId: string;
    }>;

  if (!voices.length) {
    return (
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-medium">Your voices</h2>
        <p className="text-sm text-muted-foreground mt-1">
          No voices yet. Upload a sample to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-medium">Your voices</h2>
      <ul className="mt-4 space-y-2">
        {voices.map((v) => (
          <li
            key={String(v._id)}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-muted/40 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate max-w-[14rem]">{v.name || "Untitled"}</div>
                <EditVoiceName voiceId={v.elevenVoiceId} initialName={v.name || ""} />
              </div>
              <div className="text-xs text-muted-foreground truncate">{new Date(v.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <code className="truncate text-xs text-muted-foreground">{v.elevenVoiceId}</code>
              <DeleteVoiceButton voiceId={v.elevenVoiceId} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
