"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FeedbackState = { type: "success" | "error"; message: string } | null;
interface CreatedProfile {
    voiceId: string;
    name: string;
}

export default function CloneVoiceForm() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const router = useRouter();
    const [voiceName, setVoiceName] = useState("");
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [profiles, setProfiles] = useState<CreatedProfile[]>([]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);

        if (!audioFile) {
            setFeedback({ type: "error", message: "Select an audio file before uploading." });
            return;
        }

        const finalName = voiceName.trim() || "My Voice";
        const formData = new FormData();
        formData.set("name", finalName);
        formData.append("file", audioFile);

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/voice/clone", {
                method: "POST",
                body: formData,
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || "Failed to save voice profile");
            }

            setFeedback({ type: "success", message: `Voice saved: ${payload.voiceId}` });
            setProfiles((prev) => [...prev, { voiceId: payload.voiceId, name: finalName }]);
            setVoiceName("");
            setAudioFile(null);
            formRef.current?.reset();
            // Refresh the page to re-render server components (VoiceList)
            router.refresh();
        } catch (error) {
            const err = error as Error;
            setFeedback({ type: "error", message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleReset() {
        formRef.current?.reset();
        setVoiceName("");
        setAudioFile(null);
        setFeedback(null);
    }

    return (
        <div className="space-y-6">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                    <Label htmlFor="voice-name">Voice name</Label>
                    <Input
                        id="voice-name"
                        placeholder="My Voice"
                        value={voiceName}
                        onChange={(event) => setVoiceName(event.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="voice-file">Audio sample</Label>
                    <Input
                        id="voice-file"
                        type="file"
                        accept="audio/*"
                        onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Upload a short clip (WEBM, MP3, WAV). 30 seconds of clear speech works best.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Uploading..." : "Upload sample"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleReset} disabled={isSubmitting}>
                        Reset
                    </Button>
                </div>

                {feedback && (
                    <p
                        className={`text-sm ${
                            feedback.type === "error" ? "text-destructive" : "text-muted-foreground"
                        }`}
                    >
                        {feedback.type === "error" ? `Error: ${feedback.message}` : feedback.message}
                    </p>
                )}
            </form>

            {profiles.length > 0 && (
                <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                        Recently created profiles
                    </h3>
                    <ul className="mt-2 space-y-2 text-sm">
                        {profiles.map((profile) => (
                            <li
                                key={profile.voiceId}
                                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-muted/40 px-3 py-2"
                            >
                                <span className="font-medium">{profile.name}</span>
                                <code className="truncate text-xs text-muted-foreground">{profile.voiceId}</code>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
