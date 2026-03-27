"use client";

import { useState, useEffect } from "react";
import { PHASE_NAMES } from "@/lib/constants";

interface PhaseTimerProps {
  phase: number;
  phaseEndTime: number;
  round: number;
}

export default function PhaseTimer({
  phase,
  phaseEndTime,
  round,
}: PhaseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    function tick() {
      const remaining = Math.max(
        0,
        Math.floor((phaseEndTime - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phaseEndTime]);

  const totalDuration = Math.max(
    1,
    Math.floor((phaseEndTime - Date.now()) / 1000) + timeLeft
  );
  const progress =
    phaseEndTime > 0 ? Math.min(1, timeLeft / Math.max(totalDuration, 1)) : 0;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Color transitions: gold depleting, red < 10s with pulse
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  let barColor = "bg-[#E2B714]";
  let textColor = "text-[#E2B714]";
  if (isUrgent) {
    barColor = "bg-[#FF4655] animate-pulse";
    textColor = "text-[#FF4655]";
  } else if (isWarning) {
    barColor = "bg-[#E2B714]/70";
    textColor = "text-[#E2B714]";
  }

  const phaseName = PHASE_NAMES[phase] ?? "Unknown";

  return (
    <div className="flex items-center gap-4">
      {/* Phase name + LIVE dot */}
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#FF4655] animate-pulse" />
        <span
          className="text-sm font-bold text-[#D4D0E0] uppercase tracking-wider"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {phaseName}
        </span>
        {round > 0 && (
          <>
            <div className="w-px h-3.5 bg-white/[0.08]" />
            <span className="text-xs text-[#7A7490] font-mono tabular-nums">
              R{round}
            </span>
          </>
        )}
      </div>

      {/* Timer bar + countdown */}
      {phaseEndTime > 0 && (
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <div className="flex-1 h-1.5 bg-[#201F32] rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-linear`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span
            className={`text-sm font-mono font-bold ${textColor} min-w-[3rem] text-right tabular-nums`}
          >
            {timeDisplay}
          </span>
        </div>
      )}
    </div>
  );
}
