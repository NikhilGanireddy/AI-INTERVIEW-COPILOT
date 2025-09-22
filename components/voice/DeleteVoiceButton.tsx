"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DeleteVoiceButton({ voiceId }: { voiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    const ok = window.confirm("Delete this voice clone? This cannot be undone.");
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/voice/${voiceId}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading}>
        {loading ? "Deleting..." : "Delete"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

