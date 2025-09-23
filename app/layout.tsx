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
import GlassSurface from "@/components/ui/GlassSurface";

const authenticatedLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/meeting", label: "Meeting" },
    { href: "/copilot", label: "Copilot" },
    { href: "/voice/clone", label: "Clone" },
    { href: "/voice/tts", label: "Text to Speech" },
];

export const metadata: Metadata = {
    title: "Interview Trainer",
    description: "Next.js + Clerk + MongoDB starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <html lang="en" className="h-full" suppressHydrationWarning>
                <body className="min-h-screen bg-[linear-gradient(120deg,#0b0f16_0%,#0d1018_60%,#0b0f16_100%)] text-foreground antialiased">
                    <GlassSurface />
                    <ClickSpark sparkColor="#ffffff" sparkCount={10} sparkRadius={18} duration={450}>
                        <div className="relative z-10 mx-auto min-h-screen max-w-7xl p-4 sm:p-6 lg:p-10">
                            <div className="glass rounded-3xl p-4 sm:p-6 lg:p-10">
                                <div className="flex flex-col gap-6">
                                    <header className="border-b border-white/10 bg-white/10 shadow-lg shadow-black/5 backdrop-blur">
                                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                                            <Link href={"/"} className="text-lg font-semibold text-white">
                                                Interview Trainer
                                            </Link>
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
                                    <main className="flex-1 overflow-hidden">
                                        <div className="h-full min-h-0">
                                            {children}
                                        </div>
                                    </main>
                                </div>
                            </div>
                        </div>
                    </ClickSpark>
                </body>
            </html>
        </ClerkProvider>
    );
}
