// components/ui/GlassSurface.tsx
"use client";

import React from "react";

type Props = {
  /** blur in px */
  blur?: number;
  /** base tint, rgb string without alpha, e.g. "255 255 255" */
  tintRGB?: string;
  /** glass alpha 0..1 */
  alpha?: number;
  /** show soft highlights that follow the cursor */
  interactive?: boolean;
  className?: string;
};

export default function GlassSurface({
  blur = 16,
  tintRGB = "255 255 255",
  alpha = 0.06,
  interactive = true,
  className,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!interactive || !ref.current) return;
    const el = ref.current;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [interactive]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={["pointer-events-none fixed inset-0 -z-10", className]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          // glass tokens
          // @ts-ignore CSS var values
          "--glass-blur": `${blur}px`,
          "--glass-rgb": tintRGB,
          "--glass-alpha": alpha,
        } as React.CSSProperties
      }
    >
      {/* rich background to blur */}
      <div className="absolute inset-0">
        {/* base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(120,120,255,0.15),transparent_60%)] dark:bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(120,120,255,0.12),transparent_60%)]" />
        {/* cursor highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_var(--mx,50%)_var(--my,40%),rgba(255,255,255,0.12),transparent_60%)] mix-blend-screen" />
        {/* subtle vertical sheen */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.10))]" />
        {/* optional grain as data-uri to avoid assets */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.65'/></svg>\")",
          }}
        />
      </div>

      {/* global blur layer that everything in front sits on */}
      <div
        className={[
          "absolute inset-0",
          "backdrop-blur-[var(--glass-blur)]",
          "bg-[rgba(var(--glass-rgb)/var(--glass-alpha))]",
          // fallback when backdrop-filter unsupported: add a faint opaque tint
          "supports-[backdrop-filter]:bg-transparent",
        ].join(" ")}
        style={
          {
            WebkitBackdropFilter: "blur(var(--glass-blur))",
          } as React.CSSProperties
        }
      />
      {/* soft inner border to sell the glass edge */}
      <div className="absolute inset-0 rounded-none border border-white/20 dark:border-white/10 [mask:linear-gradient(#000,transparent_30%)]" />
      {/* edge glow */}
      <div className="absolute inset-0 ring-1 ring-white/10 [mask:radial-gradient(120%_70%_at_50%_-20%,#000_35%,transparent_60%)]" />
    </div>
  );
}
