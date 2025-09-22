// components/voice/Recorder.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";

export default function Recorder() {
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const [recording, setRecording] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!recording) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            if (startTimeRef.current) {
                setElapsedMs(Date.now() - startTimeRef.current);
            }
        }, 100);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [recording]);

    function formatElapsed(ms: number) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    }

    async function start() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        mediaRef.current = rec;
        chunks.current = [];
        rec.ondataavailable = (e) => chunks.current.push(e.data);
        rec.start();
        startTimeRef.current = Date.now();
        setElapsedMs(0);
        setStatus("Recording...");
        setRecording(true);
    }

    async function stopAndUpload() {
        const rec = mediaRef.current;
        if (!rec) return;
        rec.onstop = async () => {
            const blob = new Blob(chunks.current, { type: "audio/webm" });
            const fd = new FormData();
            const userName =
                user?.fullName?.trim() ||
                user?.username ||
                user?.primaryEmailAddress?.emailAddress ||
                "My Voice";
            fd.set("name", userName);
            fd.append("file", new File([blob], "sample.webm", { type: "audio/webm" }));
            setStatus("Uploading sample...");
            try {
                const response = await fetch("/api/voice/clone", { method: "POST", body: fd });
                const payload = await response.json();
                const ok = response.ok;
                setStatus(
                    ok
                        ? `Voice saved: ${payload.voiceId}`
                        : `Error: ${
                              payload.error || "Failed"
                          }${payload.details ? ` - ${formatDetails(payload.details)}` : ""}`
                );
                if (ok) {
                    // Trigger re-render of server components (VoiceList)
                    router.refresh();
                }
            } catch (error) {
                const err = error as Error;
                console.error("Failed to upload recording", err);
                setStatus(`Error: ${err.message}`);
            } finally {
                rec.stream.getTracks().forEach((track) => track.stop());
                chunks.current = [];
                startTimeRef.current = null;
                setElapsedMs(0);
            }
        };
        rec.stop();
        setRecording(false);
        mediaRef.current = null;
    }

    async function speak(text: string) {
        const r = await fetch("/api/voice/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const a = await r.arrayBuffer();
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(a.slice(0));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start();
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                {!recording ? (
                    <Button onClick={start}>Record sample</Button>
                ) : (
                    <Button variant="destructive" onClick={stopAndUpload}>Stop & Save</Button>
                )}
                <Button variant="secondary" onClick={() => speak("Hello from your cloned voice!")}>
                    Test Speak
                </Button>
            </div>
            {recording && (
                <p className="text-sm text-muted-foreground">Recording time: {formatElapsed(elapsedMs)}</p>
            )}
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>
    );
}

function formatDetails(details: unknown) {
    if (typeof details === "string") {
        return details;
    }
    try {
        return JSON.stringify(details);
    } catch (error) {
        console.error("Failed to stringify error details", error);
        return "See logs for details";
    }
}
