import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check, Clock } from "lucide-react";
import React from "react";

export type PricingTier = {
    id: string;
    name: string;
    price: number;
    baseHours: number;
    bonusHours: number;
    totalHours: number;
    totalMinutes: number;
    description: string;
    benefits: string[];
    badge?: string;
    highlight?: boolean;
};

interface PricingCardProps {
    tier: PricingTier;
    cta: React.ReactNode;
}

export function PricingCard({ tier, cta }: PricingCardProps) {
    const totalHours = tier.totalHours;
    const hasBonus = tier.bonusHours > 0;

    return (
        <Card
            className={cn(
                "relative flex h-full flex-col gap-0 overflow-hidden border border-white/15 bg-white/5 text-white backdrop-blur-lg transition hover:border-white/30",
                tier.highlight && "border-white/40 bg-white/10 shadow-[0_40px_120px_-40px_rgba(168,85,247,0.6)]"
            )}
        >
            {tier.highlight ? (
                <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/15 via-transparent to-blue-500/15" />
            ) : null}
            <CardHeader className="gap-4 pb-6">
                {tier.badge ? (
                    <span className="inline-flex w-fit items-center justify-center rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                        {tier.badge}
                    </span>
                ) : null}
                <div className="space-y-2">
                    <CardTitle className="text-2xl font-semibold text-white">
                        {tier.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-white/70">
                        {tier.description}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6 pb-6">
                <div className="space-y-1">
                    <p className="text-4xl font-semibold tracking-tight">
                        ${tier.price.toFixed(2)}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-white/60">
                        One-time payment
                    </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-black/30 p-4">
                    <p className="text-lg font-semibold text-white">
                        {totalHours} interview credits
                    </p>
                    <p className="text-sm text-white/70">
                        {hasBonus
                            ? `Pay for ${tier.baseHours}, get ${tier.bonusHours} free`
                            : `${tier.baseHours} sessions ready when you are`}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                        <Clock className="size-4" /> Bundle total: {tier.totalMinutes} minutes
                    </p>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                    {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 min-w-4 text-emerald-300" />
                            <span>{benefit}</span>
                        </li>
                    ))}
                </ul>
                <div>{cta}</div>
                <p className="mt-auto text-center text-xs text-white/50">
                    30-day money-back guarantee
                </p>
            </CardContent>
        </Card>
    );
}
