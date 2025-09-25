import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { OpenSignUpButton } from "@/components/auth/open-sign-up-button";
import { PricingCard, type PricingTier } from "@/components/ui/pricing-card";
import { PurchaseCreditsButton } from "@/components/subscription/purchase-credits-button";
import {
    Check,
    Clock,
    Gift,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    DEFAULT_FREE_MINUTES,
    getOrCreateSubscription,
    listPaidPlans,
    totalMinutesForPlan,
} from "@/lib/subscription";

const features: { title: string; description: string; icon: LucideIcon }[] = [
    {
        title: "Adaptive interview copilot",
        description:
            "Practice with role-specific scenarios that evolve in real time based on your voice, story, and follow-up questions.",
        icon: Sparkles,
    },
    {
        title: "Actionable scoring rubrics",
        description:
            "Every session ends with detailed competency grading, transcript highlights, and next steps so you can iterate fast.",
        icon: ShieldCheck,
    },
    {
        title: "Voice-first practice rooms",
        description:
            "Clone your voice, speak naturally, and get comfort with remote, high-pressure interview setups before the real thing.",
        icon: Clock,
    },
];

function buildHeroHighlights(freeMinutes: number) {
    return [
        `Start with ${freeMinutes} minutes of credit on us`,
        "1 credit unlocks a full 60-minute mock interview",
        "Credits never expire — pay once, drill whenever",
        "Money-back guarantee within 30 days",
    ];
}

function buildFaqs(freeMinutes: number) {
    return [
        {
            question: "What happens after I purchase credits?",
            answer:
                "You instantly unlock the interview copilot. Credits sit in your account until you launch a mock interview and only decrement when you use them.",
        },
        {
            question: "Do credits expire or require a subscription?",
            answer:
                "Credits never expire. Your credit-based subscription only charges when you choose to top up — no automatic renewals.",
        },
        {
            question: "Do I get anything for free?",
            answer: `Yes. Every new account starts with ${freeMinutes} minutes of interview time so you can test the flow before buying more credits.`,
        },
        {
            question: "Can I get a refund if it isn't a fit?",
            answer:
                "Absolutely. Try Nika AI for 30 days. If you are not seeing value, reply to your receipt email and we will send a full refund, no questions asked.",
        },
    ];
}

export default async function Home() {
    const { userId } = await auth();
    const subscription = userId ? await getOrCreateSubscription(userId) : null;

    const plans = listPaidPlans();
    const pricingTiers: PricingTier[] = plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        baseHours: plan.baseHours,
        bonusHours: plan.bonusHours,
        totalHours: plan.baseHours + plan.bonusHours,
        totalMinutes: totalMinutesForPlan(plan),
        description: plan.description,
        benefits: plan.benefits,
        badge: plan.badge,
        highlight: plan.highlight,
    }));

    const heroHighlights = buildHeroHighlights(DEFAULT_FREE_MINUTES);
    const faqs = buildFaqs(DEFAULT_FREE_MINUTES);

    return (
        <div className="space-y-24 py-10 sm:py-16">
            <section
                id="hero"
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-14 text-white shadow-[0_40px_120px_-40px_rgba(168,85,247,0.45)] backdrop-blur-lg sm:px-10"
            >
                <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/15 via-transparent to-blue-400/15" />
                <div className="max-w-3xl space-y-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
                        <Sparkles className="size-4" />
                        Credit-based subscription
                    </span>
                    <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        Interview training that feels like the real thing.
                    </h1>
                    <p className="text-base text-white/80 sm:text-lg">
                        Launch adaptive mock interviews, get structured feedback, and stay ready for every panel while only paying for the time you actually use.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <SignedOut>
                            <OpenSignUpButton
                                label="Create your account"
                                afterSignUpUrl="/dashboard"
                                size="lg"
                                className="bg-white text-black hover:bg-white/90"
                            />
                        </SignedOut>
                        <SignedIn>
                            <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
                                <Link href="/meeting">Launch the copilot</Link>
                            </Button>
                        </SignedIn>
                        <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" asChild>
                            <Link href="#pricing">View pricing</Link>
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <ul className="grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                            {heroHighlights.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <Check className="mt-0.5 size-4 min-w-4 text-emerald-300" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur">
                            <Clock className="size-4" />
                            {subscription ? (
                                <span>
                                    {subscription.balanceMinutes} minutes available (~{subscription.balanceHours}h)
                                </span>
                            ) : (
                                <span>Includes {DEFAULT_FREE_MINUTES} minutes of starter credit</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="space-y-10">
                <div className="max-w-2xl space-y-3 text-white">
                    <h2 className="text-3xl font-semibold tracking-tight">Why candidates choose Nika AI</h2>
                    <p className="text-white/70">
                        Each credit unlocks the full interview copilot experience — live AI interviewer, instant scoring, and shareable feedback reports when you need them most.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {features.map(({ title, description, icon: Icon }) => (
                        <div
                            key={title}
                            className="glass group flex h-full flex-col gap-4 rounded-2xl border-white/10 bg-white/5 p-6 text-white/80 transition hover:border-white/30"
                        >
                            <div className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                                <Icon className="size-5" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white">{title}</h3>
                                <p className="text-sm text-white/70">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="pricing" className="space-y-10 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-white/60">
                            <Gift className="size-4" />
                            Credits never expire
                        </span>
                        <h2 className="text-3xl font-semibold tracking-tight">Pick a credit pack when you need it.</h2>
                        <p className="max-w-2xl text-white/70">
                            Match your upcoming interview loop with the right amount of practice time. You can always top up more credits later — no recurring charges.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70">
                        <ShieldCheck className="size-4" /> 30-day money-back guarantee
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {pricingTiers.map((tier) => (
                        <PricingCard
                            key={tier.id}
                            tier={tier}
                            cta={
                                <div className="flex flex-col gap-2">
                                    <SignedOut>
                                        <OpenSignUpButton
                                            label="Get credits"
                                            className="w-full bg-white text-black hover:bg-white/90"
                                            afterSignUpUrl={`/dashboard?plan=${tier.id}`}
                                            afterSignInUrl={`/dashboard?plan=${tier.id}`}
                                        />
                                    </SignedOut>
                                    <SignedIn>
                                        <PurchaseCreditsButton
                                            planId={tier.id}
                                            label={`Add ${tier.totalHours} credits`}
                                        />
                                    </SignedIn>
                                </div>
                            }
                        />
                    ))}
                </div>
            </section>

            <section id="faq" className="space-y-8 text-white">
                <div className="max-w-2xl space-y-3">
                    <h2 className="text-3xl font-semibold tracking-tight">Questions? We have answers.</h2>
                    <p className="text-white/70">
                        Booking more interviews or prepping a teammate? Reach out any time and we will tailor a credit pack for you.
                    </p>
                </div>
                <div className="grid gap-4">
                    {faqs.map(({ question, answer }) => (
                        <div
                            key={question}
                            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70 backdrop-blur"
                        >
                            <p className="text-base font-semibold text-white">{question}</p>
                            <p className="mt-2 text-sm leading-relaxed">{answer}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
