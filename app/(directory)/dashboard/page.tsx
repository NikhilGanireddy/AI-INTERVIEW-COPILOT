// app/(protected)/dashboard/page.tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import Recorder from "./../../../components/voice/Recorder";
import { getOrCreateSubscription } from "@/lib/subscription";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/sign-in");
    }

    const subscription = await getOrCreateSubscription(userId);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your practice tools, voice profiles, and credit balance.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/voice/clone">Clone a voice</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/voice/tts">Text to Speech</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/meeting">Interview Copilot</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/voice/stt">Speech to Text</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/copilot">Copilot Assistant</Link>
                </Button>
            </div>

            <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-white/60">Credit balance</p>
                        <p className="text-2xl font-semibold text-white">
                            {subscription.balanceMinutes} minutes (~{subscription.balanceHours}h)
                        </p>
                    </div>
                    <Button asChild className="bg-white text-black hover:bg-white/90">
                        <Link href="/#pricing">Add more credits</Link>
                    </Button>
                </div>
                <p className="text-xs text-white/60">
                    Credits never expire. Need more time? Choose a bundle on the pricing section of the homepage — the purchase will be added to your balance instantly.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Quick audio test</h2>
                <p className="text-sm text-muted-foreground">
                    Record a short snippet to warm up before your mock interview or to test your microphone setup.
                </p>
                <Recorder />
            </section>
        </div>
    );
}
