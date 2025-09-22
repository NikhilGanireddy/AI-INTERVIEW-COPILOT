// app/(protected)/dashboard/page.tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import Recorder from "./../../../components/voice/Recorder";

export default async function DashboardPage() {
    await auth.protect();

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your practice tools and voice profiles.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/voice/clone">Clone a voice</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/voice/tts">Text to Speech</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/meeting">Meeting</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/voice/stt">Speech to Text</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/copilot">Interview Copilot</Link>
                </Button>
            </div>

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
