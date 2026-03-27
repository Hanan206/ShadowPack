"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-store";
import type { Player } from "@/lib/ai-agents";
import { ROLE_COLORS } from "@/lib/constants";

interface VotingPanelProps {
  alivePlayers: Player[];
  currentPlayerAddress: string;
  onVote: (target: string) => void;
  hasVoted: boolean;
  round: number;
  isPlayerAlive?: boolean;
  runoffCandidates?: string[]; // addresses of tied players in runoff
}

export default function VotingPanel({
  alivePlayers,
  currentPlayerAddress,
  onVote,
  hasVoted,
  round,
  isPlayerAlive = true,
  runoffCandidates = [],
}: VotingPanelProps) {
  const { state } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Calculate vote tallies
  const voteTally: Record<string, number> = {};
  for (const target of Object.values(state.votes)) {
    voteTally[target] = (voteTally[target] ?? 0) + 1;
  }
  const maxVotes = Math.max(1, ...Object.values(voteTally));
  const isRunoff = runoffCandidates.length > 0;
  // In runoff, tied candidates can't vote
  const totalVoters = isRunoff
    ? alivePlayers.filter(p => !runoffCandidates.includes(p.address)).length
    : alivePlayers.length;
  const totalVotesCast = Object.keys(state.votes).length;

  // In runoff: only show the tied candidates. Normal: show everyone except self.
  const voteTargets = isRunoff
    ? alivePlayers.filter(p => runoffCandidates.includes(p.address))
    : alivePlayers.filter(p => p.address !== currentPlayerAddress);

  // In runoff, if current player is a candidate, they can't vote
  const canVote = isRunoff ? !runoffCandidates.includes(currentPlayerAddress) : true;

  function handleConfirmVote() {
    if (selectedTarget && !hasVoted) {
      onVote(selectedTarget);
    }
  }

  const isDead = !isPlayerAlive;

  if (isDead) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="var(--muted-color)" style={{ opacity: 0.4 }}>
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
        </svg>
        <p className="text-sm font-medium" style={{ color: "var(--muted-color)" }}>You have been eliminated</p>
        <p className="text-xs" style={{ color: "var(--muted-color)", opacity: 0.6 }}>Spectating the vote...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-1 pb-3 mb-2" style={{ borderBottom: "1px solid rgba(122,116,144,0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <h4
            className="text-[11px] font-bold uppercase tracking-[0.15em] flex items-center gap-2"
            style={{ color: "var(--red)", fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {isRunoff ? "Runoff Vote" : "Live Vote — Eliminate"}
          </h4>
          <span className="text-xs font-mono" style={{ color: "var(--muted-color)" }}>
            R{round}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1 bg-[#201F32] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4655]/60 rounded-full transition-all duration-500"
              style={{
                width: `${totalVoters > 0 ? (totalVotesCast / totalVoters) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[11px] text-[#D4D0E0] font-bold tabular-nums">
            {totalVotesCast}/{totalVoters} SPOKEN
          </span>
        </div>
      </div>

      {/* Votes against YOU banner */}
      {(() => {
        const votesAgainstMe = voteTally[currentPlayerAddress] ?? 0;
        if (votesAgainstMe > 0) {
          return (
            <div
              className="mx-1 mb-2 rounded-lg px-3 py-2 flex items-center justify-between"
              style={{
                background: "rgba(255,70,85,0.1)",
                border: "1px solid rgba(255,70,85,0.2)",
                animation: "breakingFlash 1s ease",
              }}
            >
              <span className="text-xs font-bold" style={{ color: "var(--red)" }}>
                Votes against you
              </span>
              <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded" style={{ background: "rgba(255,70,85,0.15)", color: "var(--red)" }}>
                {votesAgainstMe}
              </span>
            </div>
          );
        }
        return null;
      })()}

      {/* Vote targets */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hasVoted && (
          <div className="bg-[#3B9B6D]/8 border border-[#3B9B6D]/15 rounded-xl p-3 mb-1">
            <div className="flex items-center gap-2 justify-center">
              <svg
                className="w-3.5 h-3.5 text-[#3B9B6D]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-xs text-[#3B9B6D] font-medium">
                Vote submitted. Waiting for others...
              </p>
            </div>
          </div>
        )}

        {voteTargets.map((player) => {
          const votes = voteTally[player.address] ?? 0;
          const votePercentage =
            totalVotesCast > 0 ? (votes / totalVotesCast) * 100 : 0;
          const isSelected = selectedTarget === player.address;
          const roleColor =
            player.roleRevealed && player.role !== undefined
              ? ROLE_COLORS[player.role]
              : undefined;

          return (
            <button
              key={player.address}
              onClick={() => !hasVoted && setSelectedTarget(player.address)}
              disabled={hasVoted}
              className={`
                vote-card w-full text-left flex-col !items-stretch !gap-2
                ${isSelected && !hasVoted ? "accused" : ""}
                ${hasVoted ? "cursor-default opacity-80" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold"
                    style={
                      roleColor
                        ? {
                            backgroundColor: `${roleColor}15`,
                            color: roleColor,
                          }
                        : {
                            backgroundColor: "rgba(110, 86, 207, 0.12)",
                            color: "#6E56CF",
                          }
                    }
                  >
                    {player.alias.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[#D4D0E0]">
                        {player.alias}
                      </span>
                      {player.isAi && (
                        <span className="text-[9px] bg-[#6E56CF]/15 text-[#6E56CF] px-1.5 py-0.5 rounded font-medium">
                          AI
                        </span>
                      )}
                      {isSelected && !hasVoted && (
                        <span className="text-[9px] bg-[#FF4655]/15 text-[#FF4655] px-1.5 py-0.5 rounded font-bold uppercase">
                          ACCUSED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#7A7490] tabular-nums">
                  {votes} vote{votes !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Vote bar */}
              <div className="w-full h-1.5 bg-[#0B0A14] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    votes === maxVotes && votes > 0
                      ? "bg-[#FF4655]"
                      : "bg-[#7A7490]/40"
                  }`}
                  style={{ width: `${votePercentage}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {!hasVoted && canVote && (
        <div className="pt-3 mt-auto" style={{ borderTop: "1px solid rgba(122,116,144,0.08)" }}>
          <button
            onClick={handleConfirmVote}
            disabled={!selectedTarget}
            className="btn-red w-full !text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {selectedTarget
              ? `Cast Vote — ${voteTargets.find((p) => p.address === selectedTarget)?.alias ?? "..."}`
              : "Select a player to vote"}
          </button>
        </div>
      )}
    </div>
  );
}
