"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const Beams = dynamic(() => import("./beams"), { ssr: false });

function BeamsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ position: "absolute" }}>
        <Beams beamWidth={2} beamHeight={18} beamNumber={14} lightColor="#ffffff" speed={1.8} noiseIntensity={1.6} scale={0.35} rotation={-8} />
      </div>
    </div>
  );
}

export default memo(BeamsBackground);
