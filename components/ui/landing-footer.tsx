import Link from "next/link";
import { cinzelDisplay } from "@/lib/fonts";

const navigation = [
    {
        title: "Company",
        links: [
            { label: "Technology", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
            { label: "Blog", href: "https://nika.ai" },
        ],
    },
    {
        title: "Get in touch",
        links: [
            { label: "Contact", href: "mailto:hello@nika.ai" },
            { label: "Careers", href: "mailto:careers@nika.ai" },
            { label: "Support", href: "mailto:support@nika.ai" },
            { label: "LinkedIn", href: "https://www.linkedin.com/company/nika-ai" },
        ],
    },
];

export function LandingFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative mt-24 overflow-hidden rounded-3xl border border-white/10 bg-[#123019] text-white shadow-[0_40px_120px_-40px_rgba(34,197,94,0.45)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-6 top-10 hidden text-white/10 md:block">
                    <span
                        className={`${cinzelDisplay.className} text-[12rem] leading-none tracking-[0.3em]`}
                    >
                        N
                    </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent" />
            </div>
            <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:px-10">
                <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-sm space-y-4 text-sm text-white/70">
                        <p className={`${cinzelDisplay.className} text-xs uppercase tracking-[0.5em] text-white/60`}>
                            Nika AI
                        </p>
                        <p>
                            Voice-first interview copilot delivering adaptive mock sessions, instant scoring, and actionable feedback for every candidate.
                        </p>
                    </div>
                    <div className="grid gap-10 text-sm uppercase text-white/80 md:grid-cols-2">
                        {navigation.map((group) => (
                            <div key={group.title} className="space-y-5">
                                <p className="text-xs font-semibold tracking-[0.3em] text-white/50">
                                    {group.title}
                                </p>
                                <ul className="space-y-3 text-sm normal-case text-white/80">
                                    {group.links.map((link) => (
                                        <li key={link.label}>
                                            {link.href.startsWith("http") || link.href.startsWith("mailto:") ? (
                                                <a
                                                    href={link.href}
                                                    className="transition-colors hover:text-white"
                                                    rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                                                    target={link.href.startsWith("http") ? "_blank" : undefined}
                                                >
                                                    {link.label}
                                                </a>
                                            ) : (
                                                <Link href={link.href} className="transition-colors hover:text-white">
                                                    {link.label}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div
                    className={`${cinzelDisplay.className} pointer-events-none select-none text-center text-[clamp(8rem,22vw,18rem)] uppercase leading-[0.8] tracking-[0.6em] text-white/10`}
                >
                    Nika AI
                </div>
            </div>
            <div className="relative border-t border-white/10">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-10">
                    <span>© {year} Nika AI Incorporated</span>
                    <span className="text-white/50">Rain. Made for interviewers.</span>
                </div>
            </div>
        </footer>
    );
}
