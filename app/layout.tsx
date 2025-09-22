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
import BeamsBackground from "@/components/ui/beams-background";
import ClickSpark from "@/components/ui/click-spark";

export const metadata: Metadata = {
    title: "Interview Trainer",
    description: "Next.js + Clerk + MongoDB starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <html lang="en" className="h-full">
            <body className="h-full">
            <BeamsBackground />
            <ClickSpark sparkColor="#ffffff" sparkCount={10} sparkRadius={18} duration={450}>
            <div className="relative z-10 flex h-full min-h-0 flex-col">
                <header className="border-b shrink-0">
                    <div className="flex items-center justify-between p-4">
                        <Link href={"/"} className="font-semibold">Interview Trainer</Link>
                        <nav className="flex items-center gap-3">
                            <SignedOut>
                                <SignInButton />
                                <SignUpButton />
                            </SignedOut>
                            <SignedIn>
                                <UserButton />
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
