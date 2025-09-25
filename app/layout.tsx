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
import BeamsBackground from "@/components/ui/beams-background";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/ui/landing-footer";

const authenticatedLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/meeting", label: "Interview Copilot" },
    { href: "/copilot", label: "Copilot Assistant" },
    { href: "/voice/clone", label: "Clone" },
    { href: "/voice/tts", label: "Text to Speech" },
];

export const metadata: Metadata = {
    title: "Nika AI",
    description: "Nika AI – voice-first interview practice with credit-based billing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <html lang="en" className="min-h-full rounded-2xl">
                <body className="min-h-screen min-w-screen rounded-2xl bg-black text-white overflow-x-hidden">
                    <BeamsBackground />
                    <ClickSpark sparkColor="#ffffff" sparkCount={10} sparkRadius={18} duration={450}>
                        <div className="relative z-10 flex min-h-screen w-full flex-col">
                            <nav className="w-full px-4 py-5 text-sm text-white/80 sm:px-6">
                                <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/15 bg-black/40 px-4 py-3 backdrop-blur">
                                    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-white/70">Nika</span>
                                            <span className="text-white">AI</span>
                                        </span>
                                    </Link>
                                    <SignedOut>
                                        <div className="flex items-center gap-3">
                                            <div className="hidden items-center gap-3 text-white/70 sm:flex">
                                                <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
                                                <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
                                                <a href="#features" className="transition-colors hover:text-white">Features</a>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <SignInButton mode="modal">
                                                    <Button variant="ghost" size="sm" className="border border-white/15 bg-white/5 text-white hover:border-white/40 hover:bg-white/20">
                                                        Sign in
                                                    </Button>
                                                </SignInButton>
                                                <SignUpButton mode="modal">
                                                    <Button size="sm" className="bg-white px-5 text-black hover:bg-white/90">
                                                        Get started
                                                    </Button>
                                                </SignUpButton>
                                            </div>
                                        </div>
                                    </SignedOut>
                                    <SignedIn>
                                        <div className="flex items-center gap-3">
                                            <ul className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/80 backdrop-blur lg:flex">
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
                                </div>
                            </nav>
                            <main className="flex-1 w-full pb-16">
                                <SignedOut>
                                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                                        {children}
                                        <LandingFooter />
                                    </div>
                                </SignedOut>
                                <SignedIn>
                                    <div className="flex-1 w-full min-h-0 overflow-y-auto p-6">
                                        <div className="h-full min-h-full">
                                            {children}
                                        </div>
                                    </div>
                                </SignedIn>
                            </main>
                        </div>
                    </ClickSpark>
                </body>
            </html>
        </ClerkProvider>
    );
}
