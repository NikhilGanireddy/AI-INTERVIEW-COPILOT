"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VoiceOption = { id: string; name?: string };

export default function TTSForm({ voices }: { voices: VoiceOption[] }) {
  const [text, setText] = useState("Hello from ElevenLabs!");
  const [selected, setSelected] = useState<string>(voices[0]?.id || "");
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const options = useMemo(() => {
    const base = voices.map((v) => ({ label: v.name || v.id, value: v.id }));
    // Add a fallback pre-made example in case user has no voices
    return base.length
      ? base
      : [{ label: "Rachel (example)", value: "JBFqnCBsd6RMkjVDRZzb" }];
  }, [voices]);

  async function speak() {
    try {
      if (!audioRef.current) return;
      setPlaying(false);
      setStatus("Connecting...");

      // Fast path: stream directly via <audio src> for instant playback
      const smallEnoughForGet = (text || "").length < 1800; // avoid extremely long URLs
      if (smallEnoughForGet) {
        const qs = new URLSearchParams({ text, voiceId: selected || "" });
        audioRef.current.src = `/api/voice/stream?${qs.toString()}`;
        audioRef.current.load();
        await audioRef.current.play();
        // playing state will be set via oncanplay when data arrives
        return;
      }

      // Fallback for very long text: POST + blob (slower to first sound)
      const r = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: selected || undefined }),
      });
      if (!r.ok) {
        const payload = await r.json().catch(() => ({}));
        throw new Error(payload.error || `TTS failed (${r.status})`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;
      await audioRef.current.play();
      setPlaying(true);
      setStatus(null);
    } catch (e) {
      const err = e as Error;
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tts-voice">Voice</Label>
          <select
            id="tts-voice"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tts-speed">Speed</Label>
          <Input
            id="tts-speed"
            type="number"
            step="0.1"
            min="0.5"
            max="2"
            defaultValue="1.0"
            disabled
          />
          <p className="text-xs text-muted-foreground">Speed control coming soon.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tts-text">Text</Label>
        <textarea
          id="tts-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-md border bg-background p-3 text-sm"
          placeholder="Type something to speak..."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={speak} disabled={!text || playing}>
          {playing ? "Playing..." : "Speak"}
        </Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onCanPlay={() => {
          setPlaying(true);
          setStatus(null);
        }}
        controls
        className="w-full"
      />
    </div>
  );
}
