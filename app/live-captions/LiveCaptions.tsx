"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export default function LiveCaptions() {
  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const [partial, setPartial] = useState<string>("");
  const [finals, setFinals] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-scroll the transcript container when new text arrives
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [finals, partial]);

  async function start() {
    try {
      setPartial("");
      setFinals([]);
      setNotice(null);
      // Get short-lived token
      const tokenRes = await fetch("/api/stt/deepgram-token");
      if (!tokenRes.ok) throw new Error("Failed to get Deepgram token");
      const { token: access_token } = (await tokenRes.json()) as { token: string };

      // Ask user to share a tab/window with audio (pick the Meet tab and enable audio)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      // Stop the video track; we only need the audio
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.stop();
      streamRef.current = displayStream;

      // Connect WebSocket using browser subprotocol auth
      const url = "wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&punctuate=true&smart_format=true&interim_results=true";
      // Use 'bearer' subprotocol for access tokens from /auth/grant
      const ws = new WebSocket(url, ["bearer", access_token]);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          // Deepgram live messages: Results, UtteranceEnd, etc.
          if (msg.type === "Results" && msg.channel?.alternatives?.[0]) {
            const alt = msg.channel.alternatives[0] as { transcript?: string };
            const t = (alt.transcript || "").trim();
            if (!t) return;
            const isFinal = !!msg.is_final || !!msg.speech_final;
            if (isFinal) {
              setFinals((p) => [...p, t]);
              setPartial("");
            } else {
              setPartial(t);
            }
          } else if (msg.type === "UtteranceEnd") {
            // Push any leftover partial on utterance boundary
            setFinals((prev) => (partial.trim() ? [...prev, partial.trim()] : prev));
            setPartial("");
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onerror = () => {
        // Let onclose handle cleanup; avoid sending on a closed socket
        try { ws.close(); } catch { }
      };
      ws.onclose = () => {
        // Finalize any remaining partial
        setFinals((prev) => (partial.trim() ? [...prev, partial.trim()] : prev));
        setPartial("");
        setRunning(false);
      };

      ws.onopen = () => {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const rec = new MediaRecorder(displayStream, { mimeType: mime, audioBitsPerSecond: 128000 });
        recRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        rec.start(250);
        setRunning(true);
      };
    } catch (e) {
      setNotice((e as Error).message);
      setRunning(false);
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
      // Only send CloseStream if socket is open
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
        }
      } catch { }
      try { wsRef.current?.close(); } catch { }
    } finally {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      wsRef.current = null;
      streamRef.current = null;
      setRunning(false);
    }
  }

  return (
    <div className="w-full h-full space-y-4  bg-background/60">
      {notice && (
        <div className="text-xs rounded-md border px-3 py-2 border-red-500/40 bg-red-500/10 text-red-600">{notice}</div>
      )}
      <div className="flex flex-wrap items-center justify-between ">
        <div className="text-sm font-medium">Interviewer Questions</div>
        <div className="flex gap-2"><Button type="button" disabled={running} onClick={start}>
          Start captions
        </Button>
          <Button variant={"destructive"} type="button" disabled={!running} onClick={stop}>
            Stop
          </Button></div>
      </div>
      <div ref={transcriptBoxRef} className="p-3 rounded-xl border min-h-[120px] max-h-[40vh] overflow-auto whitespace-pre-wrap text-sm leading-6">
        {finals.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {partial && (
          <div className="opacity-70">{partial}</div>
        )}
        {!finals.length && !partial && (
          <div className="opacity-50">…</div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Pick the meeting tab and enable &quot;Share tab audio&quot; in the browser dialog.</p>
    </div>
  );
}
