import { auth } from "@clerk/nextjs/server";
import Recorder from "@/components/voice/Recorder";
import CloneVoiceForm from "./CloneVoiceForm";
import VoiceList from "./VoiceList";

export default async function VoiceClonePage() {
    await auth.protect();

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Clone your voice</h1>
                <p className="text-muted-foreground">
                    Upload an existing audio sample, or record a new one, to register it with ElevenLabs.
                </p>
            </div>

            <CloneVoiceForm />

            <VoiceList />

            <div className="rounded-lg border p-4">
                <h2 className="text-lg font-medium">Need a fresh sample?</h2>
                <p className="text-sm text-muted-foreground">
                    Record a short clip and we will upload it for you.
                </p>
                <div className="mt-4">
                    <Recorder />
                </div>
            </div>
        </div>
    );
}
