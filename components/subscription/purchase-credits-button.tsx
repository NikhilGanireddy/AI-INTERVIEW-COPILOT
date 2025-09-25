"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PurchaseCreditsButtonProps {
    planId: string;
    label?: string;
    className?: string;
}

type PurchaseResponse = {
    subscription?: {
        balanceMinutes: number;
        balanceHours: number;
    };
    error?: string;
};

export function PurchaseCreditsButton({ planId, label = "Get credits", className }: PurchaseCreditsButtonProps) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleClick = useCallback(async () => {
        if (pending) return;

        setPending(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch("/api/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ planId }),
            });

            const payload = (await response.json().catch(() => ({}))) as PurchaseResponse;
            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to process purchase");
            }

            if (payload.subscription) {
                setMessage(
                    `Credits added. New balance: ${payload.subscription.balanceMinutes} minutes (~${payload.subscription.balanceHours}h).`
                );
            } else {
                setMessage("Credits added to your account.");
            }

            router.refresh();
        } catch (err) {
            const description = err instanceof Error ? err.message : "Purchase failed";
            setError(description);
        } finally {
            setPending(false);
        }
    }, [pending, planId, router]);

    return (
        <div className="space-y-2">
            <Button
                onClick={handleClick}
                disabled={pending}
                className={cn("bg-white text-black hover:bg-white/90", className)}
            >
                {pending ? "Processing…" : label}
            </Button>
            {message ? <p className="text-center text-xs text-emerald-300">{message}</p> : null}
            {error ? <p className="text-center text-xs text-rose-300">{error}</p> : null}
        </div>
    );
}
