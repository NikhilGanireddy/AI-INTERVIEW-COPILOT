import { SignIn } from "@clerk/nextjs";
import type { Appearance } from "@clerk/types";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";
import { cinzelDisplay } from "@/lib/fonts";

const highlights = [
    {
        title: "Launch adaptive mock rooms in seconds",
        icon: Sparkles,
    },
    {
        title: "Track every interview with precision scoring",
        icon: ShieldCheck,
    },
    {
        title: "Pick up exactly where you left off",
        icon: Clock,
    },
];

const signInAppearance: Appearance = {
    variables: {
        colorBackground: "transparent",
        colorPrimary: "#ffffff",
        colorText: "#f8fafc",
        colorInputBackground: "rgba(15, 23, 42, 0.65)",
        colorInputText: "#f8fafc",
        colorShimmer: "rgba(250, 250, 250, 0.35)",
        borderRadius: "18px",
        fontFamily: "Inter, sans-serif",
    },
    elements: {
        rootBox: "w-full",
        card: "bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_-40px_rgba(168,85,247,0.55)] px-6 py-8 sm:px-8",
        headerTitle: "text-2xl font-semibold text-white",
        headerSubtitle: "text-white/70 text-sm",
        socialButtonsBlockButton: "bg-white text-black hover:bg-white/90 transition-colors",
        socialButtonsBlockButtonText: "text-sm font-medium",
        dividerLine: "bg-white/10",
        dividerText: "text-white/50 text-xs",
        formFieldLabel: "text-xs uppercase tracking-[0.28em] text-white/50",
        formFieldInput: "bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/25",
        footer: "text-white/60 text-xs",
        footerActionLink: "text-white font-semibold hover:text-white/80",
        formButtonPrimary: "bg-white text-black hover:bg-white/90 text-sm font-medium",
        identityPreview: "bg-white/10 border-white/20",
        formFieldWarningText: "text-amber-300 text-xs",
        formFieldSuccessText: "text-emerald-300 text-xs",
        badge: "bg-white/10 text-white/80",
    },
    layout: {
        socialButtonsPlacement: "bottom",
        shimmer: false,
    },
};

export default function Page() {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-16 text-white sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-emerald-400/10" />
            <div className="relative z-10 grid w-full max-w-5xl gap-10 rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-3xl sm:p-12 md:grid-cols-[1.05fr_0.95fr]">
                <div className="flex flex-col justify-between gap-10">
                    <div className="space-y-6">
                        <p className={`${cinzelDisplay.className} text-xs uppercase tracking-[0.7em] text-white/60`}>Nika AI</p>
                        <h1 className="text-4xl font-semibold leading-tight">
                            Jump back into your interview lab.
                        </h1>
                        <p className="max-w-md text-white/70">
                            Resume adaptive mock interviews, review coaching notes, and stay warmed up for the next panel without missing a beat.
                        </p>
                    </div>
                    <ul className="space-y-4 text-sm text-white/75">
                        {highlights.map(({ title, icon: Icon }) => (
                            <li key={title} className="flex items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                                    <Icon className="size-4" />
                                </span>
                                <span>{title}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex items-center justify-center">
                    <SignIn appearance={signInAppearance} path="/sign-in" routing="path" />
                </div>
            </div>
            <div
                className={`${cinzelDisplay.className} pointer-events-none absolute bottom-[-5%] left-1/2 -translate-x-1/2 text-[clamp(14rem,42vw,28rem)] uppercase leading-[0.7] tracking-[0.6em] text-white/5`}
            >
                Nika
            </div>
        </div>
    );
}
