"use client";

import { useState } from "react";
import type { Player } from "@/lib/ai-agents";
import { MIST_PER_OCT } from "@/lib/constants";

interface BettingPanelProps {
  alivePlayers: Player[];
  onPlaceBet: (target: string, amount: bigint) => void;
  activeBets: { id: string; target: string; targetAlias: string; amount: bigint; timestamp: number }[];
  totalBetPool: Record<string, bigint>;
}

function formatOct(mist: bigint): string {
  const whole = mist / BigInt(MIST_PER_OCT);
  const frac = mist % BigInt(MIST_PER_OCT);
  const fracStr = frac.toString().padStart(9, "0").slice(0, 2);
  return `${whole}.${fracStr}`;
}

export default function BettingPanel({
  onPlaceBet,
  activeBets,
  totalBetPool,
}: BettingPanelProps) {
  const [selectedSide, setSelectedSide] = useState<"villagers" | "werewolves" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [hasBet, setHasBet] = useState(false);

  const villagerPool = totalBetPool["villagers"] ?? BigInt(0);
  const wolfPool = totalBetPool["werewolves"] ?? BigInt(0);
  const totalPool = villagerPool + wolfPool;

  const villagerPct = totalPool > BigInt(0) ? Number((villagerPool * BigInt(100)) / totalPool) : 50;
  const wolfPct = 100 - villagerPct;

  function handlePlaceBet() {
    if (!selectedSide || !betAmount) return;
    const amountFloat = parseFloat(betAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) return;
    const amountMist = BigInt(Math.floor(amountFloat * MIST_PER_OCT));
    onPlaceBet(selectedSide, amountMist);
    setHasBet(true);
    setBetAmount("");
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h4
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1"
          style={{ color: "var(--gold)", fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
        >
          Who Wins?
        </h4>
        <p className="text-[11px]" style={{ color: "var(--muted-color)" }}>
          Predict the winning side
        </p>
      </div>

      {/* Pool bar */}
      {totalPool > BigInt(0) && (
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span style={{ color: "var(--green)" }}>Village {villagerPct}%</span>
            <span className="tabular-nums" style={{ color: "var(--gold)" }}>{formatOct(totalPool)} OCT</span>
            <span style={{ color: "var(--red)" }}>Wolves {wolfPct}%</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="transition-all duration-500" style={{ width: `${villagerPct}%`, background: "var(--green)" }} />
            <div className="transition-all duration-500" style={{ width: `${wolfPct}%`, background: "var(--red)" }} />
          </div>
        </div>
      )}

      {/* Side selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => !hasBet && setSelectedSide("villagers")}
          disabled={hasBet}
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer disabled:cursor-default"
          style={{
            background: selectedSide === "villagers" ? "rgba(59,155,109,0.12)" : "var(--elevated)",
            border: `1.5px solid ${selectedSide === "villagers" ? "var(--green)" : "rgba(122,116,144,0.1)"}`,
          }}
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill={selectedSide === "villagers" ? "var(--green)" : "var(--muted-color)"}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className="text-sm font-bold" style={{ color: selectedSide === "villagers" ? "var(--green)" : "var(--text)" }}>
            Villagers
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-color)" }}>Win by deduction</span>
        </button>

        <button
          onClick={() => !hasBet && setSelectedSide("werewolves")}
          disabled={hasBet}
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer disabled:cursor-default"
          style={{
            background: selectedSide === "werewolves" ? "rgba(255,70,85,0.12)" : "var(--elevated)",
            border: `1.5px solid ${selectedSide === "werewolves" ? "var(--red)" : "rgba(122,116,144,0.1)"}`,
          }}
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill={selectedSide === "werewolves" ? "var(--red)" : "var(--muted-color)"}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="text-sm font-bold" style={{ color: selectedSide === "werewolves" ? "var(--red)" : "var(--text)" }}>
            Werewolves
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-color)" }}>Win by numbers</span>
        </button>
      </div>

      {/* Bet amount + place */}
      {!hasBet && selectedSide && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="OCT amount"
            min="0"
            step="0.1"
            className="flex-1 rounded-lg px-3 py-2.5 text-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            style={{
              background: "var(--void)",
              border: "1px solid rgba(122,116,144,0.1)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            onClick={handlePlaceBet}
            disabled={!betAmount || parseFloat(betAmount) <= 0}
            className="btn-gold text-xs !py-2.5 !px-4 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Bet
          </button>
        </div>
      )}

      {/* Bet confirmation */}
      {hasBet && (
        <div className="rounded-xl p-3" style={{ background: "rgba(59,155,109,0.08)", border: "1px solid rgba(59,155,109,0.15)" }}>
          <div className="flex items-center gap-2 justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="var(--green)">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs font-medium" style={{ color: "var(--green)" }}>
              Bet placed on {selectedSide === "villagers" ? "Village" : "Wolves"} winning!
            </p>
          </div>
        </div>
      )}

      {/* Active bets */}
      {activeBets.length > 0 && (
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted-color)" }}>
            Your Bets
          </h4>
          <div className="space-y-1.5">
            {activeBets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--elevated)" }}
              >
                <span className="text-xs" style={{ color: "var(--text)" }}>
                  {bet.targetAlias === "villagers" ? "Village wins" : "Wolves win"}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color: "var(--gold)" }}>
                  {formatOct(bet.amount)} OCT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
