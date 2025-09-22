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
  const [lastEvent, setLastEvent] = useState<string>("");
  const [mode, setMode] = useState<"mic" | "remote" | "screen">("mic");
  const [remoteUrl, setRemoteUrl] = useState("http://stream.live.vc.bbcmedia.co.uk/bbc_world_service");

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
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const partialRef = useRef("");
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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
  function startPcmStreaming(stream: MediaStream, connection: NonNullable<DGConnection>, ac: AudioContext) {
    try {
      const source = ac.createMediaStreamSource(stream);
      const proc = ac.createScriptProcessor(4096, 1, 1);
      source.connect(proc);
      proc.connect(ac.destination);
      sourceRef.current = source;
      procRef.current = proc;

      proc.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0);
        const buf = new ArrayBuffer(input.length * 2);
        const view = new DataView(buf);
        for (let i = 0; i < input.length; i++) {
          const sample = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        }
        connection.send(buf);
      };
    } catch (e) {
      setNotice({ kind: 'error', message: (e as Error).message });
      setTimeout(()=>setNotice(null), 2500);
    }
  }

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
      setStatus("Preparing...");
      setCounts({ finals: 0, partials: 0, utterances: 0 });
      setFinals([]);
      setPartial("");
      setLastEvent("");

      // Decide recorder container/codec ahead of time for mic/screen
      let preferMime: string | undefined;
      let preferCodec: 'opus' | undefined;
      const isSafari = typeof navigator !== 'undefined' && /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent);
      let pcmFallback = false;
      let pcmSampleRate = 16000;
      if (mode !== 'remote') {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          preferMime = 'audio/webm;codecs=opus';
          preferCodec = 'opus';
        } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          preferMime = 'audio/ogg;codecs=opus';
          preferCodec = 'opus';
        } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')) {
          preferMime = 'audio/webm';
          // codec unknown; omit encoding param
        }
        // On Safari (poor Opus support) or when no Opus codec available, fall back to PCM via WebAudio
        if (!preferCodec || isSafari) {
          pcmFallback = true;
          try {
            const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 16000 });
            pcmSampleRate = ac.sampleRate;
            audioCtxRef.current = ac;
          } catch {
            audioCtxRef.current = new AudioContext();
            pcmSampleRate = audioCtxRef.current.sampleRate;
          }
        } else if (!preferMime) {
          throw new Error('This browser does not support Opus recording (webm/ogg). Try Chrome.');
        }
      }

      // Acquire capture stream first (Safari requires capture to be invoked directly from user gesture)
      let capturedStream: MediaStream | null = null;
      if (mode === "mic") {
        capturedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (mode === "screen") {
        capturedStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true } as DisplayMediaStreamOptions);
        displayStreamRef.current = capturedStream;
        const audioTracks = capturedStream.getAudioTracks();
        if (!audioTracks.length) {
          setNotice({ kind: "error", message: 'No audio captured. In the picker, select the tab and enable "Share tab audio".' });
        }
      }

      const token = await getToken();
      setStatus("Connecting to Deepgram...");
      const dg = createClient({ accessToken: token });
      const liveOptions: Record<string, unknown> = {
        model: cfg.model || "nova-3",
        language: cfg.language,
        smart_format: cfg.smart_format,
        punctuate: cfg.punctuate,
        interim_results: true,
        utterances: true,
        vad_events: true,
        no_delay: true,
        endpointing: 300,
      };
      if (mode !== "remote") {
        if (pcmFallback) {
          liveOptions.encoding = 'linear16';
          liveOptions.sample_rate = pcmSampleRate;
        } else if (preferCodec) {
          // Deepgram expects codec (e.g., 'opus'), not container ('webm')
          liveOptions.encoding = preferCodec; // 'opus'
          liveOptions.sample_rate = 48000;
        }
      }
      const connection = dg.listen.live(liveOptions);
      connRef.current = connection;
      closingRef.current = false;

      connection.on(LiveTranscriptionEvents.Open, async () => {
        setStatus("Streaming audio...");
        setListening(true);

        // Keep connection alive periodically (helps avoid idle closes)
        try {
          if (!keepAliveTimerRef.current) {
            keepAliveTimerRef.current = setInterval(() => {
              try {
                const c = connRef.current as { keepAlive?: () => void } | null;
                c?.keepAlive?.();
              } catch {}
            }, 10000);
          }
        } catch {}

        if (mode === "mic") {
          const stream = capturedStream!;
          if (pcmFallback && audioCtxRef.current) {
            startPcmStreaming(stream, connection, audioCtxRef.current);
          } else {
            const rec = new MediaRecorder(stream, { mimeType: preferMime });
            mediaRef.current = rec;
            rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) connection.send(e.data); };
            rec.onstart = () => setListening(true);
            rec.onstop = () => {
              try { connection.finalize?.(); } catch {}
              finalizeTimerRef.current = setTimeout(() => { try { connection.requestClose?.(); } catch {} }, 300);
            };
            rec.start(250);
          }
        } else if (mode === "screen") {
          // Use previously captured screen/tab stream
          const ds = capturedStream!;
          const audioTracks = ds.getAudioTracks();
          const audioStream = audioTracks.length ? new MediaStream(audioTracks) : ds;
          if (pcmFallback && audioCtxRef.current) {
            startPcmStreaming(audioStream, connection, audioCtxRef.current);
          } else {
            const rec = new MediaRecorder(audioStream, { mimeType: preferMime });
            mediaRef.current = rec;
            rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) connection.send(e.data); };
            rec.onstart = () => setListening(true);
            rec.onstop = () => {
              try { connection.finalize?.(); } catch {}
              finalizeTimerRef.current = setTimeout(() => { try { connection.requestClose?.(); } catch {} }, 300);
            };
            // If user stops sharing from browser UI, end capture
            const [vtrack] = ds.getVideoTracks();
            vtrack?.addEventListener('ended', () => { try { rec.stop(); } catch {} });
            rec.start(250);
          }
        } else {
          // Remote stream mode via server proxy
          if (!/^https?:\/\//i.test(remoteUrl)) {
            setStatus("Invalid remote URL");
            return;
          }
          try {
            const ac = new AbortController();
            abortRef.current = ac;
            const r = await fetch(`/api/stt/remote?url=${encodeURIComponent(remoteUrl)}`, { signal: ac.signal });
            if (!r.ok || !r.body) {
              setStatus(`Remote fetch failed (${r.status})`);
              return;
            }
            const reader = r.body.getReader();
            readerRef.current = reader;
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value && value.byteLength) {
                connection.send(value.buffer);
              }
            }
            try { connection.finalize?.(); } catch {}
            finalizeTimerRef.current = setTimeout(() => {
              try { connection.requestClose?.(); } catch {}
            }, 300);
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              setStatus(`Remote stream error: ${(err as Error).message}`);
            }
          }
        }
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data: unknown) => {
        setLastEvent("Results");
        try {
          const d = data as {
            channel?: { alternatives?: Array<{ transcript?: string }> };
            is_final?: boolean;
            speech_final?: boolean;
          };
          const alt = d?.channel?.alternatives?.[0];
          const text = (alt?.transcript || "").trim();
          if (!text) return;
          console.log("[DG Results]", { final: !!(d.is_final || d.speech_final), text });
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
        setLastEvent("UtteranceEnd");
        const p = partialRef.current.trim();
        if (p.length) {
          setFinals((prev) => [...prev, p]);
          setPartial("");
        }
        setCounts((c) => ({ ...c, utterances: c.utterances + 1 }));
      });

      connection.on(LiveTranscriptionEvents.Metadata, (m: unknown) => {
        setLastEvent("Metadata");
        console.log("[DG Metadata]", m);
      });
      connection.on(LiveTranscriptionEvents.SpeechStarted, () => setLastEvent("SpeechStarted"));
      connection.on(LiveTranscriptionEvents.Unhandled, (u: unknown) => {
        console.log("[DG Unhandled]", u);
      });

      connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
        let message = "Deepgram error";
        let statusCode: number | undefined;
        let requestId: string | undefined;
        let url: string | undefined;
        let readyState: number | undefined;

        try {
          type DGErr = {
            message?: string;
            statusCode?: number;
            requestId?: string;
            url?: string;
            readyState?: number;
            error?: { toJSON?: () => unknown; message?: string };
          };
          const e = err as DGErr;
          message = e?.message || e?.error?.message || message;
          statusCode = e?.statusCode;
          requestId = e?.requestId;
          url = e?.url;
          readyState = e?.readyState;
          // Prefer structured error details when available
          const json = e?.error?.toJSON?.();
          if (json) {
            const j = json as Partial<{ statusCode: number; requestId: string; url: string; readyState: number }>;
            statusCode = j.statusCode ?? statusCode;
            requestId = j.requestId ?? requestId;
            url = j.url ?? url;
            readyState = j.readyState ?? readyState;
          }
        } catch {}

        setStatus(message || "Deepgram error");
        setNotice({
          kind: "error",
          message: `DG Error${statusCode ? ` ${statusCode}` : ""}${requestId ? ` · id ${requestId}` : ""}`,
        });
        console.error("[DG Error]", { message, statusCode, requestId, url, readyState, raw: err as object });
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        setLastEvent("close");
        // On close, persist last partial
        const p = partialRef.current.trim();
        if (p.length) {
          setFinals((prev) => [...prev, p]);
          setPartial("");
        }
        setStatus(null);
        setListening(false);
        closingRef.current = true;
        if (keepAliveTimerRef.current) {
          clearInterval(keepAliveTimerRef.current);
          keepAliveTimerRef.current = null;
        }
        if (finalizeTimerRef.current) {
          clearTimeout(finalizeTimerRef.current);
          finalizeTimerRef.current = null;
        }
        try {
          const rec = mediaRef.current;
          if (rec) rec.stream.getTracks().forEach((t) => t.stop());
          const ds = displayStreamRef.current;
          ds?.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
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
    // Stop PCM pipeline
    try {
      procRef.current?.disconnect();
      sourceRef.current?.disconnect();
      procRef.current = null;
      sourceRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    } catch {}
    // Abort remote fetch, if any
    try {
      abortRef.current?.abort();
    } catch {}
    // Stop display capture, if any
    try {
      const ds = displayStreamRef.current;
      ds?.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    } catch {}
    // Clear keep-alives
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
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
        <div className="space-y-2">
          <Label>Source</Label>
          <div className="flex h-9 items-center gap-1 rounded-md border bg-background px-1 text-xs">
            <button type="button" className={`px-2 py-1 rounded ${mode === "mic" ? "bg-foreground text-background" : ""}`} onClick={() => setMode("mic")}>
              Microphone
            </button>
            <button type="button" className={`px-2 py-1 rounded ${mode === "screen" ? "bg-foreground text-background" : ""}`} onClick={() => setMode("screen")}>
              Select tab/window
            </button>
            <button type="button" className={`px-2 py-1 rounded ${mode === "remote" ? "bg-foreground text-background" : ""}`} onClick={() => setMode("remote")}>
              Remote URL
            </button>
          </div>
        </div>
      </div>

      {mode === "remote" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="dg-remote">Remote Stream URL</Label>
            <Input id="dg-remote" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://example.com/stream.mp3" />
            <p className="text-xs text-muted-foreground">Audio stream to proxy and transcribe (mp3/aac/ogg).</p>
          </div>
          <div className="flex items-end gap-2">
            {!listening ? (
              <Button onClick={start}>Start</Button>
            ) : (
              <>
                <Button variant="destructive" onClick={stop}>Stop</Button>
                <Button variant="secondary" onClick={reset}>Clear</Button>
              </>
            )}
          </div>
        </div>
      )}

      {(mode === "mic" || mode === "screen") && (
        <div className="flex items-center gap-2">
          {!listening ? (
            <Button onClick={start}>{mode === "screen" ? "Select" : "Start Listening"}</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={stop}>Stop</Button>
              <Button variant="secondary" onClick={reset}>Clear</Button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${listening ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
          <span>{listening ? "Streaming…" : "Not streaming"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Finals: {counts.finals}</span>
          <span>Partials: {counts.partials}</span>
          <span>Utterances: {counts.utterances}</span>
          {lastEvent ? <span>Last: {lastEvent}</span> : null}
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
      {mode === 'screen' && (
        <p className="text-xs text-muted-foreground">Tip: Choose Chrome Tab and enable &quot;Share tab audio&quot; to capture sound.</p>
      )}
    </div>
  );
}
