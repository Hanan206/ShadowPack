"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-store";
import { AGENT_PERSONALITIES } from "@/lib/ai-agents";
import { MIST_PER_OCT, MIN_PLAYERS } from "@/lib/constants";

interface GameLobbyProps {
  gameId: string;
  isHost: boolean;
  currentPlayerAddress: string;
  onAddAiPlayer: (alias: string, personalityIndex: number) => void;
  onStartGame: () => void;
  onJoinGame: (alias: string) => void;
  hasJoined: boolean;
  stakeAmount: bigint;
  maxPlayers: number;
}

function formatOct(mist: bigint): string {
  const whole = mist / BigInt(MIST_PER_OCT);
  const frac = mist % BigInt(MIST_PER_OCT);
  const fracStr = frac.toString().padStart(9, "0").slice(0, 2);
  return `${whole}.${fracStr}`;
}

const AGENT_COLORS: Record<string, string> = {
  "Detective Noir": "#94a3b8",
  "Luna Howl": "#c084fc",
  Razor: "#f87171",
  Whisper: "#a78bfa",
  Jester: "#fbbf24",
  Paranoia: "#fb923c",
};

function getPlayerColor(alias: string, index: number): string {
  if (AGENT_COLORS[alias]) return AGENT_COLORS[alias];
  const fallback = ["#94a3b8", "#c084fc", "#f87171", "#a78bfa", "#fbbf24", "#fb923c", "#3B9B6D", "#6E56CF"];
  return fallback[index % fallback.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// Positions for player slots around the ritual circle (percentages)
const SLOT_POSITIONS = [
  { left: "50%", top: "4%" },    // top
  { left: "83%", top: "17%" },   // top-right
  { left: "96%", top: "50%" },   // right
  { left: "83%", top: "83%" },   // bottom-right
  { left: "50%", top: "96%" },   // bottom
  { left: "17%", top: "83%" },   // bottom-left
  { left: "4%", top: "50%" },    // left
  { left: "17%", top: "17%" },   // top-left
];

export default function GameLobby({
  gameId,
  isHost,
  currentPlayerAddress,
  onAddAiPlayer,
  onStartGame,
  onJoinGame,
  hasJoined,
  stakeAmount,
  maxPlayers,
}: GameLobbyProps) {
  const { state } = useGame();
  const [selectedPersonality, setSelectedPersonality] = useState(0);
  const [joinAlias, setJoinAlias] = useState("");
  const [copied, setCopied] = useState(false);

  const playerCount = state.players.length;
  const canStart = playerCount >= MIN_PLAYERS && isHost;
  const isFull = playerCount >= maxPlayers;
  const displaySlots = Math.min(maxPlayers, 8);

  function handleCopyLink() {
    const url = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleAddAi() {
    const personality = AGENT_PERSONALITIES[selectedPersonality];
    onAddAiPlayer(personality.name, selectedPersonality);
  }

  function handleJoin() {
    const trimmed = joinAlias.trim();
    if (trimmed) onJoinGame(trimmed);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--void)" }}>
      {/* Aurora background */}
      <div className="aurora" />

      {/* Chyron header */}
      <div className="chyron relative z-10" style={{ borderBottom: "1px solid rgba(226,183,20,0.12)", background: "linear-gradient(90deg, var(--surface) 0%, transparent 100%)" }}>
        <span className="chyron-title">Lobby &mdash; Room {gameId.slice(0, 8)}</span>
        <span className="live-label"><span className="live-dot" /> LIVE</span>
        <span className="chyron-meta">{playerCount}/{maxPlayers} Players</span>
      </div>

      {/* Main content: 2-column layout */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-20 py-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* LEFT: Ritual Circle (55%) */}
            <div className="lg:w-[55%] flex justify-center">
              <div className="ritual-circle-container">
                <div className="ritual-ring" />
                <div className="ritual-ring-inner" />

                {/* Center fire + stake */}
                <div className="ritual-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="ShadowPack" width={48} height={48} style={{ objectFit: "contain" }} />
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--gold)", letterSpacing: "1px" }}>
                    {formatOct(stakeAmount)} OCT
                  </span>
                </div>

                {/* Player slots */}
                {SLOT_POSITIONS.slice(0, displaySlots).map((pos, i) => {
                  const player = state.players[i];
                  const color = player ? getPlayerColor(player.alias, i) : undefined;

                  return (
                    <div
                      key={i}
                      className="player-slot"
                      style={{ left: pos.left, top: pos.top, ...(color ? { "--slot-color": color } as React.CSSProperties : {}) }}
                    >
                      {player ? (
                        <>
                          <div
                            className="player-avatar"
                            style={{ borderColor: `${color}60`, backgroundColor: `${color}12` }}
                          >
                            <span className="text-sm font-bold" style={{ color }}>{getInitials(player.alias)}</span>
                          </div>
                          <span className="player-name">{player.alias}</span>
                          <span className="player-badge" style={{ color: player.isAi ? color : "var(--green)" }}>
                            {player.isAi ? "AI" : player.address === currentPlayerAddress ? "YOU" : "HUMAN"}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="player-avatar empty">
                            <span className="text-lg" style={{ color: "var(--muted-color)" }}>+</span>
                          </div>
                          <span className="player-name" style={{ color: "var(--muted-color)" }}>Open</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Settings + Agent Browser + Actions (45%) */}
            <div className="lg:w-[45%] flex flex-col gap-5 w-full">

              {/* Game Settings */}
              <div className="panel-card">
                <h3>Game Settings</h3>
                <div className="setting-row">
                  <span className="setting-label">Players</span>
                  <span className="setting-value">{maxPlayers}</span>
                </div>
                <div className="setting-row">
                  <span className="setting-label">Min to Start</span>
                  <span className="setting-value">{MIN_PLAYERS}</span>
                </div>
                <div className="setting-row">
                  <span className="setting-label">Stake</span>
                  <span className="setting-value" style={{ color: "var(--gold)" }}>{formatOct(stakeAmount)} OCT</span>
                </div>
                <div className="setting-row" style={{ borderBottom: "none" }}>
                  <span className="setting-label">Room</span>
                  <span className="setting-value font-mono text-xs">{gameId.slice(0, 12)}...</span>
                </div>
              </div>

              {/* AI Agents browser */}
              <div className="panel-card">
                <h3>AI Agents</h3>
                <div className="agent-mini-list">
                  {AGENT_PERSONALITIES.map((agent, i) => {
                    const alreadyAdded = state.players.some(p => p.alias === agent.name);
                    return (
                      <div
                        key={i}
                        className="agent-mini-card"
                        style={{
                          opacity: alreadyAdded ? 0.4 : 1,
                          cursor: alreadyAdded ? "default" : "pointer",
                          borderLeft: `3px solid ${agent.color}`,
                        }}
                        onClick={() => {
                          if (!alreadyAdded && isHost && !isFull) {
                            onAddAiPlayer(agent.name, i);
                          }
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                        >
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="ami-name">{agent.name}</div>
                          <div className="ami-trait">{agent.style}</div>
                        </div>
                        {alreadyAdded && (
                          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--green)" }}>
                            Added
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Join form (non-host, not yet joined) */}
              {!hasJoined && !isFull && (
                <div className="panel-card">
                  <h3>Join the Circle</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinAlias}
                      onChange={(e) => setJoinAlias(e.target.value)}
                      placeholder="Your alias..."
                      maxLength={20}
                      className="flex-1 bg-[var(--void)] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted-color)] focus:outline-none focus:border-[var(--gold)]/40 focus:ring-1 focus:ring-[var(--gold)]/20 transition-all"
                      style={{ color: "var(--text)" }}
                    />
                    <button
                      onClick={handleJoin}
                      disabled={!joinAlias.trim()}
                      className="btn-gold text-xs !py-2.5 !px-5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Join ({formatOct(stakeAmount)} OCT)
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {isHost && !isFull && (
                  <button className="btn-add-ai" onClick={handleAddAi}>
                    + Add AI Agent
                  </button>
                )}
                {isHost && (
                  <button
                    className="btn-go-live"
                    onClick={onStartGame}
                    disabled={!canStart}
                    style={!canStart ? { background: "var(--elevated)", color: "var(--muted-color)", animation: "none", cursor: "not-allowed" } : {}}
                  >
                    {canStart && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                    {canStart ? "GO LIVE" : `Need ${MIN_PLAYERS - playerCount} more`}
                  </button>
                )}
              </div>

              {/* Copy invite link */}
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: copied ? "var(--green)" : "var(--muted-color)",
                }}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy Invite Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
