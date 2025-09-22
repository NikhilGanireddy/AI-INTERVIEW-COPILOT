import type { Metadata } from "next";
import {
    ClerkProvider,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import React from "react";
import Link from "next/link";
import ClickSpark from "@/components/ui/click-spark";
import DarkVeil from "@/components/ui/dark-veil";

const authenticatedLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/meeting", label: "Meeting" },
    { href: "/copilot", label: "Copilot" },
    { href: "/voice/clone", label: "Clone" },
    { href: "/voice/tts", label: "Text to Speech" },
    { href: "/voice/stt", label: "Speech to Text" },
];

export const metadata: Metadata = {
    title: "Interview Trainer",
    description: "Next.js + Clerk + MongoDB starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <html lang="en" className="h-full">
                <body className="h-full">
                    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                        <DarkVeil />
                    </div>
                    <ClickSpark sparkColor="#ffffff" sparkCount={10} sparkRadius={18} duration={450}>
                        <div className="relative z-10 flex h-full min-h-0 flex-col">
                            <header className="border-b border-white/10 bg-white/10 shadow-lg shadow-black/5 backdrop-blur">
                                <div className="flex items-center justify-between gap-4 px-4 py-3">
                                    <Link href={"/"} className="text-lg font-semibold text-white">Interview Trainer</Link>
                                    <nav className="flex items-center gap-3 text-sm">
                                        <SignedOut>
                                            <div className="flex items-center gap-2">
                                                <SignInButton />
                                                <SignUpButton />
                                            </div>
                                        </SignedOut>
                                        <SignedIn>
                                            <div className="flex items-center gap-3">
                                                <ul className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/80 backdrop-blur">
                                                    {authenticatedLinks.map(({ href, label }) => (
                                                        <li key={href}>
                                                            <Link
                                                                href={href}
                                                                className="inline-flex items-center rounded-full px-3 py-1 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white/60"
                                                            >
                                                                {label}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <UserButton appearance={{ elements: { userButtonAvatarBox: "ring-1 ring-white/50" } }} />
                                            </div>
                                        </SignedIn>
                                    </nav>
                                </div>
                            </header>
                            <main className="flex-1 overflow-hidden p-6">
                                <div className="h-full min-h-0">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </ClickSpark>
                </body>
            </html>
        </ClerkProvider>
    );
}
