import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import STTClient from "./stt-client";

export default async function STTPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Speech to Text</h1>
        <p className="text-muted-foreground">Turn on your mic and transcribe in real time with Deepgram.</p>
      </div>
      <STTClient />
    </div>
  );
}

