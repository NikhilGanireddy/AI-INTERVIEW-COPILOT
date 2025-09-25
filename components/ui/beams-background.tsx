"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const Beams = dynamic(() => import("./beams"), { ssr: false });

function BeamsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ position: "absolute" }}>
        <Beams beamWidth={2} beamHeight={30} beamNumber={14} lightColor="#AE00FF" speed={2} noiseIntensity={2.5} scale={0.35} rotation={30} />
      </div>
    </div>
  );
}

export default memo(BeamsBackground);
