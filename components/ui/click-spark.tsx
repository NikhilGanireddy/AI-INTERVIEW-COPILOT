"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";

export type ClickSparkProps = {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  extraScale?: number;
  children: ReactNode;
};

type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
};

function ClickSpark({
  sparkColor = "#ffffff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getParent = (): HTMLElement | null => canvas.parentElement as HTMLElement | null;

    function resizeCanvas() {
      const parent = getParent();
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const targetW = Math.floor(width * dpr);
      const targetH = Math.floor(height * dpr);

      if (canvas) {
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        // Keep CSS size in CSS pixels
        canvas.style.width = `${Math.floor(width)}px`;
        canvas.style.height = `${Math.floor(height)}px`;
      }
    }

    const parentForObserver = getParent();
    if (!parentForObserver) return;

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(parentForObserver);
    resizeCanvas();

    return () => {
      observer.disconnect();
    };
  }, []);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case "linear":
          return t;
        case "ease-in":
          return t * t;
        case "ease-in-out":
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:
          return t * (2 - t);
      }
    },
    [easing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = easeFunc(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current != null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [duration, easeFunc, sparkColor, sparkRadius, sparkSize, extraScale]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Convert to canvas pixel space if DPR scaling is used
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const x = (event.clientX - rect.left) * dpr;
      const y = (event.clientY - rect.top) * dpr;
      const now = performance.now();

      const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, index) => ({
        x,
        y,
        angle: (2 * Math.PI * index) / sparkCount,
        startTime: now,
      }));

      sparksRef.current.push(...newSparks);
    },
    [sparkCount]
  );

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          userSelect: "none",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}

export default ClickSpark;