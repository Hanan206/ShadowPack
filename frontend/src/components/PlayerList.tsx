"use client";

import type { Player } from "@/lib/ai-agents";
import { ROLE_NAMES, ROLE_COLORS } from "@/lib/constants";
import { AGENT_PERSONALITIES } from "@/lib/ai-agents";

interface PlayerListProps {
  players: Player[];
  currentPlayerAddress?: string;
  compact?: boolean;
}

function getAgentColor(alias: string): string {
  const agent = AGENT_PERSONALITIES.find((a) => a.name === alias);
  return agent?.color ?? "#94a3b8";
}

export default function PlayerList({
  players,
  currentPlayerAddress,
  compact = false,
}: PlayerListProps) {
  const aliveCount = players.filter((p) => p.isAlive).length;

  return (
    <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className="flex items-center justify-between px-1 mb-2">
        <h4
          className="text-[11px] uppercase tracking-[0.15em] font-bold"
          style={{ color: "var(--muted-color)", fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
        >
          Players
        </h4>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-color)" }}>
          {aliveCount}/{players.length} alive
        </span>
      </div>
      {players.map((player) => {
        const isCurrentPlayer = player.address === currentPlayerAddress;
        const roleColor =
          player.roleRevealed && player.role !== undefined
            ? ROLE_COLORS[player.role]
            : undefined;
        const roleName =
          player.roleRevealed && player.role !== undefined
            ? ROLE_NAMES[player.role]
            : undefined;

        // Use agent personality color for AI players, fallback for humans
        const personalityColor = player.isAi ? getAgentColor(player.alias) : "#94a3b8";

        return (
          <div
            key={player.address}
            className={`
              pp-player
              ${!player.isAlive ? "dead" : ""}
              ${isCurrentPlayer ? "ring-1 ring-[var(--gold)]/25" : ""}
            `}
            style={
              player.isAlive
                ? {
                    borderLeft: `3px solid ${roleColor ?? personalityColor}`,
                    background: "var(--elevated)",
                    borderRadius: 8,
                  }
                : { borderRadius: 8 }
            }
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="pp-avatar"
                style={{
                  borderColor: roleColor ?? personalityColor,
                  width: 32,
                  height: 32,
                }}
              >
                <span
                  className="text-[11px] font-bold"
                  style={{ color: roleColor ?? (player.isAlive ? personalityColor : "rgb(107, 114, 128)") }}
                >
                  {player.alias.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2`}
                style={{
                  borderColor: "var(--elevated)",
                  backgroundColor: player.isAlive ? "var(--green)" : "var(--muted-color)",
                  ...(player.isAlive ? { animation: "livePulse 1.5s ease-in-out infinite" } : {}),
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-medium truncate ${
                    player.isAlive ? "" : "line-through"
                  }`}
                  style={{ color: player.isAlive ? "var(--text)" : "var(--muted-color)" }}
                >
                  {player.alias}
                </span>
                {isCurrentPlayer && (
                  <span className="text-[10px] font-medium" style={{ color: "var(--gold)" }}>
                    (You)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {player.isAi && (
                  <span className="text-[9px] bg-[#6E56CF]/15 text-[#6E56CF] px-1.5 py-0.5 rounded font-medium">
                    AI
                  </span>
                )}
                {roleName && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: `${roleColor}15`,
                      color: roleColor,
                    }}
                  >
                    {roleName}
                  </span>
                )}
                {!player.isAlive && !roleName && (
                  <span className="text-[9px] text-[#FF4655] font-bold uppercase tracking-wider">
                    ELIMINATED
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
