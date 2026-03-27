"use client";

import { useGame } from "@/lib/game-store";
import {
  ROLE_NAMES,
  ROLE_COLORS,
  EXPLORER_URL,
  MIST_PER_OCT,
} from "@/lib/constants";
import Link from "next/link";

interface GameResultProps {
  gameId: string;
  onPlayAgain?: () => void;
}

function formatOct(mist: bigint): string {
  const whole = mist / BigInt(MIST_PER_OCT);
  const frac = mist % BigInt(MIST_PER_OCT);
  const fracStr = frac.toString().padStart(9, "0").slice(0, 2);
  return `${whole}.${fracStr}`;
}

export default function GameResult({ gameId, onPlayAgain }: GameResultProps) {
  const { state } = useGame();

  const isVillageWin = state.winner === "villagers";
  const winnerLabel = isVillageWin
    ? "The Village Survives"
    : "The Pack Devours All";
  const winnerColor = isVillageWin ? "text-[#E2B714]" : "text-[#FF4655]";

  // Separate players by role
  const werewolves = state.players.filter((p) => p.role === 1);
  const villageTeam = state.players.filter((p) => p.role !== 1);

  // Game stats
  const totalRounds = state.round;
  const eliminatedCount = state.players.filter((p) => !p.isAlive).length;
  const totalMessages = state.chatHistory.filter((m) => !m.isSystem).length;

  function getRoleClass(role: number): string {
    switch (role) {
      case 1: return "wolf";
      case 2: return "seer";
      case 3: return "doctor";
      default: return "villager";
    }
  }

  const allPlayers = [...werewolves, ...villageTeam];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-[900px] flex flex-col items-center gap-10 py-10 px-6 overflow-y-auto max-h-[90vh]"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(226,183,20,0.06) 0%, transparent 60%), var(--void)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Winner announcement */}
        <div className="text-center flex flex-col items-center gap-3">
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--gold)", letterSpacing: "2px" }}
          >
            Game Over
          </p>
          <h1
            className="crimson text-4xl lg:text-5xl tracking-wide"
            style={{ color: isVillageWin ? "var(--text)" : "var(--text)", letterSpacing: "2px" }}
          >
            {winnerLabel}
          </h1>
          <p className="text-base" style={{ color: "var(--muted-color)", maxWidth: 500 }}>
            After {totalRounds} round{totalRounds !== 1 ? "s" : ""} of deception and deduction
          </p>
        </div>

        {/* Role reveal: 4-column grid with flip animation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {allPlayers.map((p, i) => {
            const role = p.role ?? 0;
            const roleColor = ROLE_COLORS[role];
            return (
              <div
                key={p.address}
                className="role-reveal-card flex flex-col items-center text-center gap-2 p-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid rgba(122,116,144,0.1)",
                  borderRadius: 14,
                  animationDelay: `${i * 0.12}s`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                >
                  {p.alias.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  {p.alias}
                </span>
                <span
                  className={`rr-role ${getRoleClass(role)} text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full`}
                >
                  {ROLE_NAMES[role]}
                </span>
                <span
                  className={`text-[10px] ${p.isAlive ? "rr-status survived" : "rr-status eliminated"}`}
                >
                  {p.isAlive ? "Survived" : "Eliminated"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex gap-10 flex-wrap justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "var(--gold)" }}>{totalRounds}</p>
            <p className="text-xs tracking-wider" style={{ color: "var(--muted-color)" }}>Rounds</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "var(--gold)" }}>{eliminatedCount}</p>
            <p className="text-xs tracking-wider" style={{ color: "var(--muted-color)" }}>Eliminated</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "var(--gold)" }}>{totalMessages}</p>
            <p className="text-xs tracking-wider" style={{ color: "var(--muted-color)" }}>Messages</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {onPlayAgain && (
            <button onClick={onPlayAgain} className="btn-gold !text-base !py-4 !px-10">
              Play Again
            </button>
          )}
          <Link href="/game" className="btn-outline !text-base !py-4 !px-10">
            Exit
          </Link>
          <a
            href={`${EXPLORER_URL}/object/${gameId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg transition-all"
            style={{ background: "var(--elevated)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--muted-color)" }}
            title="View on Explorer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
