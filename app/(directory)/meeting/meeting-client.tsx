"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import clsx from "clsx";

type CopilotProfileSummary = {
  id: string;
  profileName: string;
  jobRole: string;
  resume: {
    mode: string | null;
    hasFile: boolean;
    fileName: string | null;
    fileSize: number | null;
    textLength: number;
  };
  jobDescription: {
    mode: string | null;
    hasFile: boolean;
    fileName: string | null;
    fileSize: number | null;
    textLength: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type CopilotProfileDetail = {
  id: string;
  profileName: string;
  jobRole: string;
  projectDetails: string;
  resume: {
    mode: string | null;
    text: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
  };
  jobDescription: {
    mode: string | null;
    text: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
};

const GROUP_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function getGroupKey(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()].join("-");
}

function renderAnswerContent(answer: string) {
  const lines = answer.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  let inCodeBlock = false;

  const flushBullets = () => {
    if (!bullets.length) return;
    const bucketKey = key++;
    nodes.push(
      <ul key={`bullet-${bucketKey}`} className="list-disc space-y-1 pl-4 text-foreground">
        {bullets.map((item, idx) => (
          <li key={`bullet-${bucketKey}-${idx}`}>{item}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    if (/^```/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    trimmed = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
    trimmed = trimmed.replace(/`{1,3}/g, "");

    if (inCodeBlock) {
      flushBullets();
      const codeKey = key++;
      nodes.push(
        <pre key={`code-${codeKey}`} className="rounded bg-muted/60 px-2 py-1 font-mono text-[0.7rem] text-foreground">
          {trimmed}
        </pre>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushBullets();

    const headingMatch = trimmed.match(/^([^:]{2,80}):\s*(.*)$/);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      const rest = headingMatch[2].trim();
      const headingKey = key++;
      nodes.push(
        <p key={`line-${headingKey}`} className="text-foreground">
          <span className="font-semibold">{heading}</span>
          {rest ? `: ${rest}` : ":"}
        </p>
      );
      continue;
    }

    const textKey = key++;
    nodes.push(
      <p key={`line-${textKey}`} className="text-foreground">
        {trimmed}
      </p>
    );
  }

  flushBullets();

  const cleaned = nodes.length ? nodes : [
    <p key="fallback" className="text-foreground">
      {answer.trim()}
    </p>
  ];

  return <div className="space-y-1">{cleaned}</div>;
}

type MeetingClientProps = {
  initialMinutes: number;
};

export default function MeetingClient({ initialMinutes }: MeetingClientProps) {
  const [status, setStatus] = useState<string>("Idle");
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [transcriptInput, setTranscriptInput] = useState("");
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);
  const partialRef = useRef("");
  const committedTranscriptRef = useRef("");
  const [livePartial, setLivePartial] = useState("");
  const userEditingRef = useRef(false);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const lang = "en-US";
  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const usePcmRef = useRef(false);
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
  }
  const previousProfileIdRef = useRef<string>("");
  const [profiles, setProfiles] = useState<CopilotProfileSummary[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<CopilotProfileDetail | null>(null);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [profileDetailError, setProfileDetailError] = useState<string | null>(null);
  const [customInstructionsInput, setCustomInstructionsInput] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [availableMinutes, setAvailableMinutes] = useState(initialMinutes);
  const availableMinutesRef = useRef<number>(initialMinutes);
  const captureStartedAtRef = useRef<number | null>(null);
  const creditTickerRef = useRef<number | null>(null);
  const liveElapsedSecondsRef = useRef(0);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  useEffect(() => {
    availableMinutesRef.current = availableMinutes;
  }, [availableMinutes]);

  useEffect(() => {
    setAvailableMinutes((prev) => {
      if (prev === initialMinutes) return prev;
      return initialMinutes;
    });
    availableMinutesRef.current = initialMinutes;
  }, [initialMinutes]);
  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0 && !profilesLoading && !profilesError) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, profilesError, profilesLoading, selectedProfileId]);
  useEffect(() => {
    if (!selectedProfileId) {
      sessionIdRef.current = "";
      setQa([]);
      qaRef.current = [];
      qaIdRef.current = 0;
      setTranscriptInput("");
      committedTranscriptRef.current = "";
      partialRef.current = "";
      setLivePartial("");
      setCustomInstructions("");
      setCustomInstructionsInput("");
      return;
    }
    sessionIdRef.current = `${selectedProfileId}-${Date.now()}`;
    setQa([]);
    qaRef.current = [];
    qaIdRef.current = 0;
    setTranscriptInput("");
    committedTranscriptRef.current = "";
    partialRef.current = "";
    setLivePartial("");
    setCustomInstructions("");
    setCustomInstructionsInput("");
  }, [selectedProfileId]);
  useEffect(() => {
    let cancelled = false;
    async function fetchProfiles() {
      try {
        setProfilesLoading(true);
        const res = await fetch("/api/copilot/profiles");
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          throw new Error(raw || `Failed to load profiles (${res.status})`);
        }
        const data = (await res.json().catch(() => ({}))) as {
          profiles?: CopilotProfileSummary[];
        };
        if (cancelled) return;
        setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setProfilesError(null);
      } catch (error) {
        console.error("Unable to load Copilot Assistant profiles", error);
        if (!cancelled) setProfilesError((error as Error).message || "Unable to load profiles");
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    }
    void fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setSelectedProfile(null);
      setProfileDetailError(null);
      setProfileDetailLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchDetail() {
      try {
        setProfileDetailLoading(true);
        setProfileDetailError(null);
        const res = await fetch(`/api/copilot/profiles?id=${encodeURIComponent(selectedProfileId)}`);
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          throw new Error(raw || `Failed to load profile (${res.status})`);
        }
        const data = (await res.json().catch(() => ({}))) as {
          profile?: CopilotProfileDetail;
        };
        if (cancelled) return;
        if (data.profile) {
          setSelectedProfile(data.profile);
          setProfileDetailError(null);
        } else {
          throw new Error("Profile details missing");
        }
      } catch (error) {
        console.error("Unable to load profile detail", error);
        if (!cancelled) {
          setProfileDetailError((error as Error).message || "Unable to load profile detail");
          setSelectedProfile(null);
        }
      } finally {
        if (!cancelled) setProfileDetailLoading(false);
      }
    }
    void fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId]);

  // Answer (Grok) state
  type QAItem = {
    id: number;
    q: string;
    a: string;
    answering: boolean;
    dbId?: string | null;
    askedAt?: string | null;
    answeredAt?: string | null;
    profileId?: string | null;
  };
  const [qa, setQa] = useState<QAItem[]>([]);
  const qaIdRef = useRef(0);
  const currentAnswerAbortRef = useRef<AbortController | null>(null);
  const qaRef = useRef<QAItem[]>([]);
  const answersBoxRef = useRef<HTMLDivElement | null>(null);
  const [selectedQaId, setSelectedQaId] = useState<number | null>(null);
  const selectedQa = selectedQaId != null ? qa.find((item) => item.id === selectedQaId) ?? null : null;
  const historyItems = useMemo(() => {
    return [...qa].sort((a, b) => {
      const aTime = a.askedAt ? Date.parse(a.askedAt) : 0;
      const bTime = b.askedAt ? Date.parse(b.askedAt) : 0;
      return bTime - aTime;
    });
  }, [qa]);
  useEffect(() => {
    const el = answersBoxRef.current; if (!el) return; el.scrollTop = el.scrollHeight;
  }, [qa, selectedQaId]);
  useEffect(() => {
    qaRef.current = qa;
    setSelectedQaId((prev) => {
      if (prev != null && qa.some((item) => item.id === prev)) {
        return prev;
      }
      if (qa.length) {
        return qa[qa.length - 1]?.id ?? null;
      }
      return null;
    });
  }, [qa]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcriptInput, livePartial]);

  const refreshCredits = useCallback(async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/subscription", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as {
        subscription?: { balanceMinutes?: number };
      };
      const minutes = typeof data.subscription?.balanceMinutes === "number"
        ? Math.max(0, data.subscription.balanceMinutes)
        : 0;
      setAvailableMinutes(minutes);
      availableMinutesRef.current = minutes;
      return minutes;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const clearCreditTicker = useCallback(() => {
    if (creditTickerRef.current != null) {
      window.clearInterval(creditTickerRef.current);
      creditTickerRef.current = null;
    }
    liveElapsedSecondsRef.current = 0;
    setLiveElapsedSeconds(0);
  }, []);

  const startCreditTicker = useCallback(() => {
    captureStartedAtRef.current = Date.now();
    liveElapsedSecondsRef.current = 0;
    setLiveElapsedSeconds(0);
    if (creditTickerRef.current != null) {
      window.clearInterval(creditTickerRef.current);
    }
    creditTickerRef.current = window.setInterval(() => {
      if (!captureStartedAtRef.current) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - captureStartedAtRef.current) / 1000));
      if (elapsed !== liveElapsedSecondsRef.current) {
        liveElapsedSecondsRef.current = elapsed;
        setLiveElapsedSeconds(elapsed);
      }
    }, 1000);
  }, []);

  const settleCredits = useCallback(async () => {
    const startedAt = captureStartedAtRef.current;
    captureStartedAtRef.current = null;
    const elapsedMs = startedAt ? Date.now() - startedAt : 0;
    clearCreditTicker();
    if (!startedAt || elapsedMs <= 0) return;

    const elapsedSeconds = elapsedMs / 1000;
    const rawMinutes = elapsedSeconds / 60;
    const roundedMinutes = Math.max(0.01, Number(rawMinutes.toFixed(2)));
    const minutesToDeduct = Math.min(roundedMinutes, Math.max(availableMinutesRef.current, 0));
    if (!Number.isFinite(minutesToDeduct) || minutesToDeduct <= 0) return;

    try {
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutes: minutesToDeduct }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to record credit usage");
      }
      await refreshCredits();
    } catch (error) {
      console.error("Failed to consume credits", error);
      setNotice((error as Error).message || "Unable to update credits");
      setTimeout(() => setNotice(null), 3000);
    }
  }, [clearCreditTicker, refreshCredits, setNotice]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!selectedProfileId) {
        qaIdRef.current = 0;
        setQa([]);
        return;
      }
      try {
        const res = await fetch(`/api/meeting/history?limit=50&profileId=${encodeURIComponent(selectedProfileId)}`);
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          throw new Error(raw || `History load failed (${res.status})`);
        }
        const data = (await res.json().catch(() => ({}))) as {
          history?: Array<{
            id?: string;
            question?: string;
            answer?: string;
            askedAt?: string;
            answeredAt?: string | null;
          }>;
        };
        if (cancelled) return;
        const history = Array.isArray(data.history) ? data.history : [];
        const mapped: QAItem[] = history.map((item, idx) => ({
          id: idx + 1,
          q: item.question ?? "",
          a: item.answer ?? "",
          answering: false,
          dbId: item.id ?? null,
          askedAt: item.askedAt ?? null,
          answeredAt: item.answeredAt ?? null,
          profileId: (item as { profileId?: string }).profileId ?? selectedProfileId ?? null,
        }));
        qaIdRef.current = mapped.length;
        qaRef.current = mapped;
        setQa(mapped);
      } catch (error) {
        console.error("Failed to load meeting history", error);
        if (!cancelled) {
          setNotice((error as Error).message || "Unable to load Interview Copilot history");
        }
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId]);

  function appendToTranscript(raw: string) {
    const next = raw.trim();
    if (!next) return;
    const base = committedTranscriptRef.current
      ? `${committedTranscriptRef.current} ${next}`
      : next;
    committedTranscriptRef.current = base;
    if (!userEditingRef.current) {
      setTranscriptInput(base);
    }
    setLivePartial("");
    partialRef.current = "";
  }

  const createMeetingTurn = useCallback(
    async (
      question: string,
      askedAtISO: string,
      order: number,
      answer?: string,
      answeredAtISO?: string | null
    ) => {
      if (!selectedProfileId) return null;
      if (!sessionIdRef.current) {
        sessionIdRef.current = `${selectedProfileId}-${Date.now()}`;
      }
      try {
        const res = await fetch("/api/meeting/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            sessionId: sessionIdRef.current,
            profileId: selectedProfileId,
            order,
            askedAt: askedAtISO,
            answer,
            answeredAt: answeredAtISO ?? undefined,
          }),
        });
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
        throw new Error(raw || `Interview Copilot history save failed (${res.status})`);
        }
        const data = (await res.json().catch(() => ({}))) as {
          turn?: { id?: string };
        };
        return data.turn?.id ?? null;
      } catch (error) {
        console.error("Failed to persist meeting question", error);
        return null;
      }
    },
    [selectedProfileId]
  );

  const truncateText = useCallback((value: string, max = 1200) => {
    if (value.length <= max) return value;
    return `${value.slice(0, max)}…`;
  }, []);

  const handleApplyInstructions = useCallback(() => {
    const trimmed = customInstructionsInput.trim();
    setCustomInstructions(trimmed);
    setCustomInstructionsInput(trimmed);
    if (!trimmed) {
      setNotice("Cleared Grok tone guidance.");
    } else {
      setNotice("Updated conversational tone for Grok.");
    }
    setTimeout(() => setNotice(null), 2000);
  }, [customInstructionsInput]);

  const profilePrompt = useMemo(() => {
    if (!selectedProfile) return "";
    const parts: string[] = [];
    parts.push(`Profile name: ${selectedProfile.profileName}`);
    parts.push(`Target role: ${selectedProfile.jobRole}`);

    if (selectedProfile.resume.mode === "paste" && selectedProfile.resume.text.trim()) {
      parts.push(`Resume highlights:\n${truncateText(selectedProfile.resume.text.trim(), 1500)}`);
    } else if (selectedProfile.resume.fileName) {
      parts.push(
        `Resume file uploaded: ${selectedProfile.resume.fileName}${selectedProfile.resume.fileSize ? ` (${Math.round(selectedProfile.resume.fileSize / 1024)} KB)` : ""}`
      );
    }

    if (selectedProfile.jobDescription.mode === "paste" && selectedProfile.jobDescription.text.trim()) {
      parts.push(`Job description summary:\n${truncateText(selectedProfile.jobDescription.text.trim(), 1500)}`);
    } else if (selectedProfile.jobDescription.fileName) {
      parts.push(
        `Job description file uploaded: ${selectedProfile.jobDescription.fileName}${selectedProfile.jobDescription.fileSize ? ` (${Math.round(selectedProfile.jobDescription.fileSize / 1024)} KB)` : ""}`
      );
    }

    if (selectedProfile.projectDetails.trim()) {
      parts.push(`Project & research notes:\n${truncateText(selectedProfile.projectDetails.trim(), 1500)}`);
    }

    return parts.join("\n\n");
  }, [selectedProfile, truncateText]);

  const updateMeetingTurn = useCallback(async (id: string, answer: string, answeredAtISO: string) => {
    try {
      const res = await fetch("/api/meeting/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, answer, answeredAt: answeredAtISO }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || `Interview Copilot history update failed (${res.status})`);
      }
    } catch (error) {
      console.error("Failed to update meeting answer", error);
    }
  }, []);

  const askGrok = useCallback(
    async (
      question: string,
      id: number,
      existingRecordId: string | null = null,
      askedAtISO?: string
    ) => {
      if (!selectedProfileId) {
        setNotice("Select a Copilot Assistant profile before continuing.");
        setTimeout(() => setNotice(null), 2500);
        return;
      }
      if (!selectedProfile) {
        setNotice("Profile context unavailable. Please reselect your Copilot Assistant profile.");
        setTimeout(() => setNotice(null), 2500);
        return;
      }
      let answerBuffer = "";
      let answeredAtISO: string | null = null;
      let storedRecordId: string | null = existingRecordId;
      try {
        // Cancel any in-flight request
        try { currentAnswerAbortRef.current?.abort(); } catch { }
        const ac = new AbortController();
        currentAnswerAbortRef.current = ac;
        setQa((prev) =>
          prev.map((item) => (item.id === id ? { ...item, answering: true } : item))
        );

        // Build conversational history from prior QA items (user -> assistant turns)
        const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        for (const item of qaRef.current) {
          if (item.q) historyMessages.push({ role: 'user', content: item.q });
          if (item.a) historyMessages.push({ role: 'assistant', content: item.a });
        }
        // Limit to last ~6 turns to keep prompt short
        const MAX_TURNS = 4;
        let trimmedHistory = historyMessages;
        if (historyMessages.length > MAX_TURNS * 2) {
          trimmedHistory = historyMessages.slice(historyMessages.length - MAX_TURNS * 2);
        }

        const baseSystem = 'You are a concise technical interview coach. Keep answers short and contextual.';
        const instructionsTrimmed = customInstructions.trim();
        const systemSections: string[] = [baseSystem];
        if (profilePrompt) {
          systemSections.push(`Candidate context:\n${profilePrompt}`);
        }
        if (instructionsTrimmed) {
          systemSections.push(`Tone guidance from user: ${instructionsTrimmed}`);
        }
        const systemWithContext = systemSections.join('\n\n');

        const res = await fetch('/api/answers/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            system: systemWithContext,
            history: trimmedHistory,
          }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => "");
          setQa((prev) => prev.map((item) => item.id === id ? { ...item, a: raw || `Error ${res.status}`, answering: false } : item));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneStream = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by double newlines
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const lines = part.split("\n");
            for (const ln of lines) {
              const line = ln.trim();
              if (!line || !line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (data === '[DONE]') { doneStream = true; break; }
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.text ?? '';
                if (delta) {
                  answerBuffer += String(delta);
                  setQa((prev) =>
                    prev.map((item) =>
                      item.id === id
                        ? { ...item, a: item.a + String(delta) }
                        : item
                    )
                  );
                }
              } catch { /* ignore non-JSON keepalives */ }
            }
            if (doneStream) break;
          }
          if (doneStream) break;
        }
        answeredAtISO = new Date().toISOString();
      } catch (e) {
        // Suppress error text for aborts; otherwise record error
        const msg = (e as Error).name === 'AbortError' ? '' : ((e as Error).message || 'Answer error');
        if (msg) setQa((prev) => prev.map((item) => item.id === id ? { ...item, a: item.a || msg } : item));
        if (!answerBuffer) {
          const current = qaRef.current.find((item) => item.id === id);
          if (current?.a) answerBuffer = current.a;
        }
      } finally {
        const resolvedAnswer = answerBuffer || qaRef.current.find((item) => item.id === id)?.a || "";
        const resolvedAnsweredAt = answeredAtISO || (resolvedAnswer ? new Date().toISOString() : null);
        setQa((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, answering: false, answeredAt: resolvedAnsweredAt ?? item.answeredAt ?? null }
              : item
          )
        );

        if (resolvedAnswer || storedRecordId) {
          try {
            if (storedRecordId) {
              await updateMeetingTurn(storedRecordId, resolvedAnswer, (resolvedAnsweredAt ?? new Date().toISOString()));
            } else {
              const fallbackId = await createMeetingTurn(
                question,
                askedAtISO ?? new Date().toISOString(),
                id,
                resolvedAnswer,
                resolvedAnsweredAt ?? new Date().toISOString()
              );
              if (fallbackId) {
                storedRecordId = fallbackId;
                setQa((prev) =>
                  prev.map((item) => (item.id === id ? { ...item, dbId: fallbackId } : item))
                );
              }
            }
          } catch (error) {
            console.error("Failed to persist meeting transcript", error);
          }
        }
      }
    }, [createMeetingTurn, customInstructions, profilePrompt, selectedProfile, selectedProfileId, updateMeetingTurn]);

  const handleTranscriptSubmit = useCallback(() => {
    const committed = committedTranscriptRef.current.trim();
    const partialText = partialRef.current.trim();
    const display = transcriptInput.trim();
    let question = "";
    if (userEditingRef.current) {
      question = display;
    } else {
      question = [committed, partialText].filter(Boolean).join(" ").trim();
      if (!question && display) {
        question = display;
      }
    }
    if (!question) return;
    if (!selectedProfileId) {
      setNotice("Select a Copilot Assistant profile before submitting.");
      setTimeout(() => setNotice(null), 2500);
      return;
    }
    if (profileDetailLoading || !selectedProfile) {
      setNotice("Profile context is still loading. Please wait a moment.");
      setTimeout(() => setNotice(null), 2500);
      return;
    }
    const id = ++qaIdRef.current;
    const askedAtISO = new Date().toISOString();
    setQa((prev) => [
      ...prev,
      { id, q: question, a: "", answering: true, dbId: null, askedAt: askedAtISO, profileId: selectedProfileId },
    ]);
    setSelectedQaId(id);
    setTranscriptInput("");
    committedTranscriptRef.current = "";
    partialRef.current = "";
    setLivePartial("");
    userEditingRef.current = false;
    setIsUserEditing(false);
    void (async () => {
      const recordId = await createMeetingTurn(question, askedAtISO, id);
      if (recordId) {
        setQa((prev) =>
          prev.map((item) => (item.id === id ? { ...item, dbId: recordId } : item))
        );
      }
      await askGrok(question, id, recordId, askedAtISO);
    })();
  }, [askGrok, createMeetingTurn, profileDetailLoading, selectedProfile, selectedProfileId, transcriptInput]);

  function handleTranscriptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleTranscriptSubmit();
    }
  }

  function handleTranscriptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    userEditingRef.current = true;
    setIsUserEditing(true);
    const value = event.target.value;
    setTranscriptInput(value);
    committedTranscriptRef.current = value;
  }

  function handleTranscriptFocus() {
    userEditingRef.current = true;
    setIsUserEditing(true);
  }

  function handleTranscriptBlur() {
    userEditingRef.current = false;
    setIsUserEditing(false);
    committedTranscriptRef.current = transcriptInput;
  }

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isInteractive = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
        if (isInteractive && target !== transcriptRef.current) {
          return;
        }
      }
      event.preventDefault();
      handleTranscriptSubmit();
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handleTranscriptSubmit]);

  // Single-button flow: Start captions (capture + transcribe), Stop ends both

  function getPreferMime(): { mime: string; codec: 'opus' | undefined } | null {
    if (typeof MediaRecorder === 'undefined') return null;
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mime: 'audio/webm;codecs=opus', codec: 'opus' };
    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return { mime: 'audio/ogg;codecs=opus', codec: 'opus' };
    if (MediaRecorder.isTypeSupported('audio/webm')) return { mime: 'audio/webm', codec: undefined };
    return null;
  }

  async function getToken(): Promise<string> {
    const r = await fetch('/api/stt/deepgram-token');
    if (r.ok) { const j = await r.json() as { token?: string }; if (j.token) return j.token; }
    const fallback = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (fallback) return fallback;
    throw new Error('Missing Deepgram token');
  }

  function isSafari() {
    if (typeof navigator === 'undefined') return false;
    return /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent);
  }

  async function startTranscribe() {
    try {
      const cap = streamRef.current;
      if (!cap) { setNotice('Start capture first, then transcribe.'); setTimeout(() => setNotice(null), 2000); return; }
      const audioTracks = cap.getAudioTracks();
      if (!audioTracks.length) {
        setStatus('No audio track in capture. Choose the meeting TAB and enable "Share tab audio".');
        setNotice('No audio track detected. Pick a browser TAB and check "Share tab audio".');
        setTimeout(() => setNotice(null), 3500);
        return;
      }
      // Ensure audio track is enabled
      audioTracks.forEach(t => { try { t.enabled = true; } catch { } });
      const token = await getToken();

      // Prefer ultra-low-latency PCM streaming when available (not Safari)
      let sampleRate = 48000;
      let url = `wss://api.deepgram.com/v1/listen?model=nova-3&language=${encodeURIComponent(lang)}&smart_format=true&punctuate=true&interim_results=true&utterances=true&vad_events=true&no_delay=true&endpointing=150`;
      const preferPcm = typeof AudioContext !== 'undefined' && !isSafari();
      if (preferPcm) {
        const ac = new AudioContext();
        audioCtxRef.current = ac;
        await ac.resume().catch(() => { });
        sampleRate = ac.sampleRate || 48000;
        url += `&encoding=linear16&sample_rate=${encodeURIComponent(String(sampleRate))}`;
      } else {
        // We will fall back to MediaRecorder (Opus in WebM/OGG)
      }

      // Open WS directly to Deepgram listen endpoint using bearer subprotocol
      const ws = new WebSocket(url, ["bearer", token]);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("Capturing — live transcription running.");
        const onlyAudio = new MediaStream(audioTracks);
        if (preferPcm && audioCtxRef.current) {
          // Low-latency PCM path
          usePcmRef.current = true;
          try {
            const ac = audioCtxRef.current;
            const source = ac.createMediaStreamSource(onlyAudio);
            const proc = ac.createScriptProcessor(1024, 1, 1);
            source.connect(proc);
            proc.connect(ac.destination);
            sourceRef.current = source;
            procRef.current = proc;
            proc.onaudioprocess = (ev) => {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              const input = ev.inputBuffer.getChannelData(0);
              const buf = new ArrayBuffer(input.length * 2);
              const view = new DataView(buf);
              for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
              }
              ws.send(buf);
            };
          } catch {
            // If PCM fails, fall back to MediaRecorder
            usePcmRef.current = false;
          }
        }

        if (!usePcmRef.current) {
          const pref = getPreferMime();
          if (!pref) { setNotice('This browser cannot record Opus (try Chrome).'); setTimeout(() => setNotice(null), 2500); return; }
          const rec = new MediaRecorder(onlyAudio, { mimeType: pref.mime, audioBitsPerSecond: 128000 });
          recRef.current = rec;
          rec.ondataavailable = (e) => { if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data); };
          rec.onstop = () => {
            try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' })); } catch { }
            try { ws.close(); } catch { }
          };
          // Smaller timeslice reduces TTFP and partial latency
          rec.start(60);
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === 'Results' && msg.channel?.alternatives?.[0]) {
            const t = (msg.channel.alternatives[0]?.transcript || '').trim();
            if (!t) return;
            if (msg.is_final || msg.speech_final) {
              appendToTranscript(t);
            } else {
              partialRef.current = t;
              setLivePartial(t);
              if (!userEditingRef.current) {
                const base = committedTranscriptRef.current;
                setTranscriptInput(base ? `${base} ${t}` : t);
              }
            }
          } else if (msg.type === 'UtteranceEnd') {
            const p = partialRef.current.trim();
            if (p) {
              appendToTranscript(p);
            }
          }
        } catch { }
      };

      ws.onerror = () => {
        setNotice('Deepgram websocket error');
        setTimeout(() => setNotice(null), 2500);
      };

      ws.onclose = () => {
        const p = partialRef.current.trim();
        if (p) {
          appendToTranscript(p);
        } else {
          setLivePartial("");
          partialRef.current = "";
        }
        // Cleanup PCM path
        try { procRef.current?.disconnect(); } catch { }
        try { sourceRef.current?.disconnect(); } catch { }
        procRef.current = null; sourceRef.current = null;
        try { audioCtxRef.current?.close(); } catch { }
        audioCtxRef.current = null;
      };
    } catch (e) {
      setNotice((e as Error).message); setTimeout(() => setNotice(null), 2500);
    }
  }

  const stopTranscribe = useCallback(() => {
    try { recRef.current?.stop(); } catch { }
    try { procRef.current?.disconnect(); } catch { }
    try { sourceRef.current?.disconnect(); } catch { }
    procRef.current = null; sourceRef.current = null;
    try { audioCtxRef.current?.close(); } catch { }
    audioCtxRef.current = null;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
    } catch { }
    try { wsRef.current?.close(); } catch { }
    wsRef.current = null; recRef.current = null;
    setLivePartial("");
    partialRef.current = "";
  }, []);

  async function startCapture() {
    try {
      const latestMinutes = await refreshCredits();
      const minutesToCheck = latestMinutes ?? availableMinutes;
      if (minutesToCheck <= 0) {
        setStatus("Idle");
        setNotice("You are out of credits. Add more to continue.");
        setTimeout(() => setNotice(null), 2500);
        return;
      }
      if (!selectedProfileId) {
        setNotice("Pick a Copilot Assistant profile before starting capture.");
        setTimeout(() => setNotice(null), 2500);
        return;
      }
      if (profileDetailLoading || !selectedProfile) {
        setNotice("Profile context is still loading. Please wait a moment.");
        setTimeout(() => setNotice(null), 2500);
        return;
      }
      setStatus("Requesting tab/window capture...");
      setTranscriptInput("");
      setLivePartial("");
      partialRef.current = "";
      committedTranscriptRef.current = "";
      userEditingRef.current = false;
      setIsUserEditing(false);
      const constraints: DisplayMediaStreamOptions = {
        video: true,
        audio: true,
      } as DisplayMediaStreamOptions;

      const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia(constraints as DisplayMediaStreamOptions);
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => { });
      }
      setCapturing(true);
      startCreditTicker();
      // Quick check for an audio track; if missing, guide the user
      const hasAudio = !!stream.getAudioTracks().length;
      setStatus(hasAudio ? "Capturing — starting live transcription…" : "Capturing — no audio detected (pick a TAB and enable Share tab audio)");

      // When user stops sharing from browser UI
      const [track] = stream.getVideoTracks();
      track?.addEventListener("ended", () => {
        stopCapture();
      });

      // Immediately begin live transcription using the captured audio
      try { await startTranscribe(); } catch { /* notice already set by startTranscribe */ }
    } catch (e) {
      const msg = (e as Error).message || "Capture was cancelled";
      setStatus("Idle");
      setNotice(msg);
      setTimeout(() => setNotice(null), 2500);
    }
  }

  const stopCapture = useCallback((statusMessage?: string) => {
    try {
      try { stopTranscribe(); } catch { }
      const s = streamRef.current;
      s?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) {
        try {
          (video as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = null;
        } catch { }
      }
    } finally {
      setCapturing(false);
      setStatus(statusMessage ?? "Idle");
      void settleCredits();
    }
  }, [settleCredits, stopTranscribe]);

  useEffect(() => {
    if (!capturing) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      const minutes = await refreshCredits();
      if (cancelled) return;
      if (!captureStartedAtRef.current) return;
      if (minutes !== null) {
        const remaining = minutes - liveElapsedSecondsRef.current / 60;
        if (remaining <= 0) {
          setNotice("Your credits are finished. Meeting recording has stopped.");
          setTimeout(() => setNotice(null), 3000);
          stopCapture("Credits exhausted — captions stopped.");
        }
      }
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [capturing, refreshCredits, setNotice, stopCapture]);

  useEffect(() => {
    if (!capturing) return;
    if (!captureStartedAtRef.current) return;
    const remaining = availableMinutes - liveElapsedSeconds / 60;
    if (remaining <= 0) {
      setNotice("Your credits are finished. Meeting recording has stopped.");
      setTimeout(() => setNotice(null), 3000);
      stopCapture("Credits exhausted — captions stopped.");
    }
  }, [availableMinutes, capturing, liveElapsedSeconds, setNotice, stopCapture]);

  useEffect(() => {
    const previous = previousProfileIdRef.current;
    if (capturing && previous && previous !== selectedProfileId) {
      try { stopCapture(); } catch { }
    }
    previousProfileIdRef.current = selectedProfileId;
  }, [capturing, selectedProfileId, stopCapture]);

  useEffect(() => {
    return () => {
      try { stopCapture(); } catch { }
      try { stopTranscribe(); } catch { }
    };
  }, [stopCapture, stopTranscribe]);

  const remainingMinutesDisplay = Math.max(0, availableMinutes - liveElapsedSeconds / 60);
  const formattedRemainingMinutes = remainingMinutesDisplay.toFixed(2);
  const sessionMinutes = Math.floor(liveElapsedSeconds / 60);
  const sessionSeconds = liveElapsedSeconds % 60;
  const sessionElapsedLabel = `${sessionMinutes.toString().padStart(2, "0")}:${sessionSeconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3" data-animate="fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4 ">
          <div className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight uppercase">Interview Copilot</h1>
            </div>

          </div>
          <div className="flex items-center gap-2">
            {!capturing ? (
              <Button
                type="button"
                onClick={startCapture}
                disabled={!selectedProfileId || profileDetailLoading || !!profileDetailError || remainingMinutesDisplay <= 0}
              >
                Start captions
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={() => stopCapture()}>
                Stop
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{status}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Credits remaining:</span>
          <span>{formattedRemainingMinutes} minutes</span> -
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.7rem] text-white/70">
            Session {sessionElapsedLabel}
          </span>
        </div>
      </div>
      {notice && (
        <div className="text-xs rounded-md border px-3 py-2 border-amber-400/40 bg-amber-500/10 text-amber-700" data-animate="fade-up">
          {notice}
        </div>
      )}

      <div
        className="grid flex-1 min-h-0 gap-4 items-stretch"
        data-animate="fade-up"
        style={{ gridTemplateColumns: "minmax(0,27%) minmax(0,46%) minmax(0,27%)" }}
      >
        <section className="flex min-h-0 flex-col rounded-xl border shadow-sm border-white/15 bg-white/10 text-white/80 backdrop-blur p-3">
          <div className="text-sm font-medium mb-2 shrink-0">Interview Copilot Feed</div>
          <div className="relative w-full overflow-hidden rounded-lg bg-black/80">
            <video ref={videoRef} className="aspect-video h-full w-full object-contain" playsInline muted controls />
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <div className="text-sm font-medium mb-2 shrink-0">Live Captions</div>
            <textarea
              ref={transcriptRef}
              value={transcriptInput}
              onChange={handleTranscriptChange}
              onKeyDown={handleTranscriptKeyDown}
              onFocus={handleTranscriptFocus}
              onBlur={handleTranscriptBlur}
              disabled={!selectedProfileId || profileDetailLoading || !!profileDetailError}
              className="flex-1 min-h-0 w-full text-black resize-none overflow-auto rounded-md bg-background p-2 text-xs leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Live transcript will appear here. Type or edit text, then press Enter to send."
            />
            <p className="mt-1 text-[0.65rem] text-muted-foreground">
              Press Enter to send to Grok. Use Shift+Enter for a new line.
            </p>
            {livePartial && !isUserEditing && (
              <p className="mt-1 truncate rounded bg-muted/40 px-2 py-1 text-[0.65rem] text-muted-foreground">
                Listening… {livePartial}
              </p>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border shadow-sm border-white/15 bg-white/10 text-white/80 backdrop-blur p-3">
          <div className="text-sm font-medium mb-2 shrink-0">Your Answers</div>
          <div ref={answersBoxRef} className="flex-1 min-h-0 w-full overflow-auto rounded-md bg-background p-2 text-xs leading-6 whitespace-pre-wrap">
            {!selectedQa && (
              <div className="opacity-60">
                {!selectedProfileId
                  ? "Select a Copilot Assistant profile to begin."
                  : profileDetailLoading
                    ? "Loading profile context…"
                    : qa.length
                      ? "Pick a question from the history to review its answer."
                      : "Answers will appear here…"}
              </div>
            )}
            {selectedQa && (
              <div className="space-y-2" key={selectedQa.id}>
                <div className="font-medium text-muted-foreground">Q: {selectedQa.q}</div>
                <div className="rounded-xl border shadow-sm border-white/15 bg-white/10 text-white/80 backdrop-blur p-3">
                  {selectedQa.a ? (
                    renderAnswerContent(selectedQa.a)
                  ) : (
                    <div className="italic text-muted-foreground">Waiting for response…</div>
                  )}
                  {selectedQa.answering ? <span className="ml-1 inline-block animate-pulse text-muted-foreground">▌</span> : null}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-0 flex-col flex gap-4">
          <div className="rounded-xl border shadow-sm border-white/15 bg-white/10 text-white/80 backdrop-blur p-3 h-max">
            <div className="flex flex-wrap items-baseline-last gap-3">
              <div className="flex flex-col gap-1 min-w-[220px]">
                <span className="text-[0.7rem] font-semibold uppercase tracking-tight text-muted-foreground">
                  Copilot Assistant profile
                </span>
                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  disabled={profilesLoading || !!profilesError}
                  className="h-9 min-w-[220px] rounded-md border border-border bg-background px-3 text-xs"
                >
                  <option value="">
                    {profilesLoading ? "Loading profiles…" : "Select a Copilot Assistant profile"}
                  </option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.profileName} • {profile.jobRole}
                    </option>
                  ))}
                </select>
              </div>
              <Link href="/copilot" className="text-xs font-medium text-primary hover:underline">
                Manage profiles
              </Link>
              <div className="flex min-w-[240px] flex-1 items-center gap-2">
                <input
                  type="text"
                  value={customInstructionsInput}
                  onChange={(event) => setCustomInstructionsInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleApplyInstructions();
                    }
                  }}
                  placeholder="Optional: Describe how Grok should respond"
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!selectedProfileId || profileDetailLoading || !!profileDetailError}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyInstructions}
                  disabled={!selectedProfileId || profileDetailLoading || !!profileDetailError}
                >
                  Set tone
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {selectedProfile && !profileDetailError ? (
                <p>
                  Using <span className="font-semibold text-foreground">{selectedProfile.profileName}</span> for a mock interview targeting{' '}
                  <span className="font-semibold text-foreground">{selectedProfile.jobRole}</span>.
                </p>
              ) : (
                <p>Select a profile to unlock live captions and AI answers.</p>
              )}
              {customInstructions ? <p>Current tone guidance: {customInstructions}</p> : null}
            </div>
          </div>

          <div className="flex-1 min-h-0 rounded-xl border shadow-sm border-white/15 bg-white/10 text-white/80 backdrop-blur p-3 flex flex-col">
            <div className="text-sm font-medium mb-2 shrink-0">Q/A History</div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {historyItems.length === 0 ? (
                <div className="rounded-md border border-dashed bg-background/60 p-3 text-muted-foreground">History will appear here…</div>
              ) : (
                (() => {
                  const elements: ReactNode[] = [];
                  let lastGroupKey: string | null = null;
                  historyItems.forEach((item) => {
                    const askedDate = item.askedAt ? new Date(item.askedAt) : null;
                    const groupKey = getGroupKey(askedDate);
                    if (groupKey !== lastGroupKey) {
                      elements.push(
                        <div
                          key={`divider-${groupKey}-${item.id}`}
                          className="flex items-center gap-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground/70"
                        >
                          <span className="h-px flex-1 bg-border" />
                          <time className="whitespace-nowrap">
                            {askedDate && !Number.isNaN(askedDate.getTime())
                              ? GROUP_LABEL_FORMATTER.format(askedDate)
                              : "Recent"}
                          </time>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      );
                      lastGroupKey = groupKey;
                    }

                    const trimmed = item.a?.trim() ?? "";
                    const firstLine = trimmed.split(/\n+/)[0] ?? "";
                    const showEllipsis = trimmed.length > firstLine.length;
                    const isSelected = selectedQaId === item.id;
                    const askedAtLabel = askedDate && !Number.isNaN(askedDate.getTime())
                      ? GROUP_LABEL_FORMATTER.format(askedDate)
                      : null;

                    elements.push(
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedQaId(item.id)}
                        className={clsx(
                          "w-full rounded-md border bg-background/60 p-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary/70 bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground line-clamp-2">{item.q}</span>
                          {askedAtLabel && (
                            <time className="shrink-0 text-[0.6rem] uppercase text-muted-foreground/70">
                              {askedAtLabel}
                            </time>
                          )}
                        </div>
                        <div className="mt-1 text-muted-foreground/80">
                          {trimmed ? (
                            <span className="block line-clamp-2">
                              {firstLine}
                              {showEllipsis ? " …" : ""}
                            </span>
                          ) : item.answering ? (
                            <span className="italic text-muted-foreground">Answer in progress…</span>
                          ) : (
                            <span className="italic text-muted-foreground">Awaiting answer.</span>
                          )}
                        </div>
                      </button>
                    );
                  });
                  return <div className="flex flex-col gap-3">{elements}</div>;
                })()
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="text-xs text-muted-foreground" data-animate="fade-up">
        <p>
          How it works: Open your meeting in a separate browser tab. Click Start Capture here and choose that tab (select &quot;Share tab audio&quot; for sound).
          The shared tab’s video appears above so you can keep everything inside this app while you run AI assistance.
        </p>
      </div>
    </div>
  );
}
