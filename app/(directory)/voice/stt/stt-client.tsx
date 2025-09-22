"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

type DeepgramConfig = {
  model?: string;
  language?: string;
  smart_format?: boolean;
  punctuate?: boolean;
};

export default function STTClient() {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [finals, setFinals] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [notice, setNotice] = useState<{ message: string; kind?: "info" | "error" } | null>(null);
  const [counts, setCounts] = useState({ finals: 0, partials: 0, utterances: 0 });

  const mediaRef = useRef<MediaRecorder | null>(null);
  type DGConnection = {
    send: (data: Blob | ArrayBufferLike | string) => void;
    disconnect: (code?: number, reason?: string) => void;
    requestClose?: () => void;
    finalize?: () => void;
    on: (event: string, handler: (data: unknown) => void) => void;
  } | null;
  const connRef = useRef<DGConnection>(null);
  const closingRef = useRef(false);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const partialRef = useRef("");

  const dgKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  const cfg: DeepgramConfig = useMemo(
    () => ({ model: "nova-3", language, smart_format: true, punctuate: true }),
    [language]
  );

  useEffect(() => {
    if (!autoScroll || !transcriptBoxRef.current) return;
    transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
  }, [finals, partial, autoScroll]);

  useEffect(() => {
    partialRef.current = partial;
  }, [partial]);

  // Using the official SDK for live streaming per Deepgram docs

  async function getToken(): Promise<string> {
    type TokenResponse = { token?: string; expiresIn?: number; error?: string };
    const start = performance.now();
    // Prefer server-provided ephemeral token for security
    const r = await fetch("/api/stt/deepgram-token");
    const elapsed = Math.round(performance.now() - start);
    let body: unknown = null;
    try {
      body = await r.clone().json();
    } catch {
      // ignore non-JSON
    }
    const data = (body || {}) as TokenResponse;
    // Log to browser console with timing info
    // Example: "[Deepgram token] status 200 in 835ms { token: '...', expiresIn: 300 }"
    // or error payload when non-200
    // eslint-disable-next-line no-console
    console.log(`[Deepgram token] status ${r.status} in ${elapsed}ms`, data);
    setNotice({
      message: `Deepgram token: ${r.status} in ${elapsed}ms${r.ok && data.expiresIn ? ` (ttl ${data.expiresIn}s)` : ""}`,
      kind: r.ok ? "info" : "error",
    });
    setTimeout(() => setNotice(null), 2500);
    if (r.ok && data.token) {
      return data.token;
    }
    // Fallback for local dev if env is present
    if (dgKey) {
      // eslint-disable-next-line no-console
      console.warn("[Deepgram token] falling back to NEXT_PUBLIC_DEEPGRAM_API_KEY (dev only)");
      return dgKey;
    }
    throw new Error(
      data.error ||
        "Missing Deepgram token. Set DEEPGRAM_API_KEY on server or NEXT_PUBLIC_DEEPGRAM_API_KEY for local dev."
    );
  }

  async function start() {
    try {
      setStatus("Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;
      if (!mime) throw new Error("This browser does not support WebM/Opus recording");

      const token = await getToken();
      setStatus("Connecting to Deepgram...");
      const dg = createClient({ accessToken: token });
      const connection = dg.listen.live({
        model: cfg.model || "nova-3",
        language: cfg.language,
        smart_format: cfg.smart_format,
        // Use MediaRecorder's WebM Opus stream
        encoding: "opus",
        sample_rate: 48000,
        interim_results: true,
      });
      connRef.current = connection;
      closingRef.current = false;

      connection.on(LiveTranscriptionEvents.Open, () => {
        setStatus("Streaming audio...");
        const rec = new MediaRecorder(stream, { mimeType: mime });
        mediaRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            connection.send(e.data);
          }
        };
        rec.onstart = () => setListening(true);
        rec.onstop = () => {
          // Graceful flush & close
          try { connection.finalize?.(); } catch {}
          // Give short time for final results before requesting close
          finalizeTimerRef.current = setTimeout(() => {
            try { connection.requestClose?.(); } catch {}
          }, 300);
        };
        rec.start(250);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data: unknown) => {
        try {
          const d = data as {
            channel?: { alternatives?: Array<{ transcript?: string }> };
            is_final?: boolean;
            speech_final?: boolean;
          };
          const alt = d?.channel?.alternatives?.[0];
          const text = (alt?.transcript || "").trim();
          if (!text) return;
          if (d.is_final || d.speech_final) {
            setFinals((prev) => [...prev, text]);
            setPartial("");
            setCounts((c) => ({ ...c, finals: c.finals + 1 }));
          } else {
            setPartial(text);
            setCounts((c) => ({ ...c, partials: c.partials + 1 }));
          }
        } catch {}
      });

      // Commit partial on utterance end
      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const p = partialRef.current.trim();
        if (p.length) {
          setFinals((prev) => [...prev, p]);
          setPartial("");
        }
        setCounts((c) => ({ ...c, utterances: c.utterances + 1 }));
      });

      connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          setStatus((err as { message: string }).message);
        } else {
          setStatus("Deepgram error");
        }
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        // On close, persist last partial
        const p = partialRef.current.trim();
        if (p.length) {
          setFinals((prev) => [...prev, p]);
          setPartial("");
        }
        setStatus(null);
        setListening(false);
        closingRef.current = true;
        if (finalizeTimerRef.current) {
          clearTimeout(finalizeTimerRef.current);
          finalizeTimerRef.current = null;
        }
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
      });
    } catch (e) {
      const err = e as Error;
      setStatus(`Error: ${err.message}`);
    }
  }

  function stop() {
    setStatus("Finalizing...");
    // Stop recorder first (triggers onstop handler)
    try {
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    } catch {}
    // Safety: ensure finalize and requestClose are sent
    try { connRef.current?.finalize?.(); } catch {}
    setTimeout(() => {
      if (!closingRef.current) {
        try { connRef.current?.requestClose?.(); } catch {}
      }
    }, 600);
    // Hard disconnect if not closed within grace period
    setTimeout(() => {
      try { connRef.current?.disconnect(); } catch {}
      connRef.current = null;
      setListening(false);
      setStatus(null);
    }, 2000);
  }

  function reset() {
    setFinals([]);
    setPartial("");
    setCounts({ finals: 0, partials: 0, utterances: 0 });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {notice && (
        <div
          className={`text-xs rounded-md border px-3 py-2 ${
            notice.kind === "error" ? "border-red-500/40 bg-red-500/10 text-red-600" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dg-lang">Language</Label>
          <Input
            id="dg-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="en-US"
          />
          <p className="text-xs text-muted-foreground">Deepgram language code</p>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="h-9 rounded-md border bg-background px-3 text-sm flex items-center">
            <span className="truncate">{listening ? "Listening" : status || "Idle"}</span>
          </div>
        </div>
        <div className="space-y-2 flex items-end">
          {!listening ? (
            <Button onClick={start}>Start Listening</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={stop}>Stop</Button>
              <Button variant="secondary" onClick={reset}>Clear</Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${listening ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
          <span>{listening ? "Streaming…" : "Not streaming"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Finals: {counts.finals}</span>
          <span>Partials: {counts.partials}</span>
          <span>Utterances: {counts.utterances}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Transcript</h3>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
      </div>

      <div ref={transcriptBoxRef} className="h-64 w-full overflow-auto rounded-md border bg-background p-3 text-sm leading-6">
        {finals.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {partial && (
          <p className="opacity-70">{partial}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Note: For local dev, set NEXT_PUBLIC_DEEPGRAM_API_KEY in .env.local or implement /api/stt/deepgram-token to return an ephemeral token.
      </p>
    </div>
  );
}
