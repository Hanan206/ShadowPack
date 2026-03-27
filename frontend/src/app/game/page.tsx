"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@onelabs/dapp-kit";
import WalletConnect from "@/components/WalletConnect";
import { createGameTx } from "@/lib/contracts";
import { MIST_PER_OCT, MIN_PLAYERS, MAX_PLAYERS } from "@/lib/constants";
import { useRouter } from "next/navigation";

type ModalMode = null | "create" | "join";

export default function GameMenuPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const router = useRouter();

  const [modal, setModal] = useState<ModalMode>(null);
  const [stakeAmount, setStakeAmount] = useState("1");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [alias, setAlias] = useState("");
  const [joinGameId, setJoinGameId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCreateGame() {
    const stakeFloat = parseFloat(stakeAmount);
    if (isNaN(stakeFloat) || stakeFloat <= 0) {
      setError("Enter a valid stake amount");
      return;
    }

    setIsCreating(true);
    setError(null);

    if (!account) {
      setError("Connect your wallet first");
      setIsCreating(false);
      return;
    }

    const stakeMist = BigInt(Math.floor(stakeFloat * MIST_PER_OCT));
    const tx = createGameTx(stakeMist, maxPlayers);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const effects = result.effects as any;
          const created = effects?.created ?? [];
          const sharedObj = created.find((o: any) => o?.owner === "Shared" || o?.owner?.Shared) ?? created[0];
          const gameId: string = sharedObj?.reference?.objectId ?? "";

          sessionStorage.setItem(`game-config-${gameId || result.digest}`, JSON.stringify({
            stakeAmount: stakeFloat,
            maxPlayers,
            alias: alias || "Player",
            txDigest: result.digest,
          }));
          router.push(`/game/${gameId || result.digest}`);
          setIsCreating(false);
        },
        onError: (err) => {
          setError(err.message || "Transaction failed");
          setIsCreating(false);
        },
      }
    );
  }

  function handleJoinGame() {
    const trimmedId = joinGameId.trim();
    if (!trimmedId) {
      setError("Enter a valid game ID");
      return;
    }
    router.push(`/game/${trimmedId}`);
  }

  return (
    <div className="min-h-screen bg-[#0B0A14] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#161525]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ShadowPack" width={28} height={28} style={{ objectFit: "contain" }} />
          <h1 className="text-lg font-semibold text-[#D4D0E0] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            SHADOWPACK
          </h1>
        </div>
        <WalletConnect />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ShadowPack" width={72} height={72} style={{ objectFit: "contain" }} />
            </div>
            <h2
              className="text-3xl font-bold text-[#D4D0E0] tracking-tight mb-2"
              style={{ fontFamily: "'Crimson Text', serif" }}
            >
              The Ritual Awaits
            </h2>
            <p className="text-sm text-[#7A7490]">
              Stake. Deceive. Survive. On-chain werewolf with AI agents.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setModal("create");
                setError(null);
              }}
              disabled={!account}
              className="w-full py-4 rounded-xl bg-[#E2B714] hover:bg-[#E2B714]/90 text-[#0B0A14] font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Create Game
            </button>
            <button
              onClick={() => {
                setModal("join");
                setError(null);
              }}
              disabled={!account}
              className="w-full py-4 rounded-xl bg-transparent border border-[#E2B714]/40 hover:border-[#E2B714] hover:bg-[#E2B714]/5 text-[#E2B714] font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Join Game
            </button>
          </div>

          <p className="text-center text-xs text-[#7A7490] mt-6">
            {account
              ? `Connected: ${account.address.slice(0, 6)}...${account.address.slice(-4)} — transactions go on-chain`
              : "Connect wallet for on-chain gameplay, or play in demo mode"
            }
          </p>
        </div>
      </main>

      {/* CREATE GAME MODAL */}
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#161525] border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h3
                  className="text-sm font-bold text-[#D4D0E0] uppercase tracking-wider"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Create Ritual
                </h3>
                <button
                  onClick={() => setModal(null)}
                  className="text-[#7A7490] hover:text-[#D4D0E0] transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Stake amount */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7A7490] font-medium mb-2">
                  Stake Amount (OCT)
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="w-full bg-[#0B0A14] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-[#D4D0E0] placeholder:text-[#7A7490] focus:outline-none focus:border-[#E2B714]/40 focus:ring-1 focus:ring-[#E2B714]/20 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Max players */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7A7490] font-medium mb-2">
                  Max Players ({MIN_PLAYERS}-{MAX_PLAYERS})
                </label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) =>
                    setMaxPlayers(
                      Math.min(
                        MAX_PLAYERS,
                        Math.max(MIN_PLAYERS, Number(e.target.value))
                      )
                    )
                  }
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  className="w-full bg-[#0B0A14] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-[#D4D0E0] placeholder:text-[#7A7490] focus:outline-none focus:border-[#E2B714]/40 focus:ring-1 focus:ring-[#E2B714]/20 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Alias */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7A7490] font-medium mb-2">
                  Your Alias
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Enter your alias..."
                  maxLength={20}
                  className="w-full bg-[#0B0A14] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-[#D4D0E0] placeholder:text-[#7A7490] focus:outline-none focus:border-[#E2B714]/40 focus:ring-1 focus:ring-[#E2B714]/20 transition-all duration-200"
                />
              </div>

              {error && (
                <p className="text-xs text-[#FF4655] bg-[#FF4655]/8 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleCreateGame}
                disabled={isCreating}
                className="w-full py-3.5 rounded-lg bg-[#E2B714] hover:bg-[#E2B714]/90 text-[#0B0A14] font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {isCreating ? "Creating..." : "Begin Ritual"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN GAME MODAL */}
      {modal === "join" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#161525] border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h3
                  className="text-sm font-bold text-[#D4D0E0] uppercase tracking-wider"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Join Ritual
                </h3>
                <button
                  onClick={() => setModal(null)}
                  className="text-[#7A7490] hover:text-[#D4D0E0] transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Game ID */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7A7490] font-medium mb-2">
                  Game ID
                </label>
                <input
                  type="text"
                  value={joinGameId}
                  onChange={(e) => setJoinGameId(e.target.value)}
                  placeholder="Paste game ID or link..."
                  className="w-full bg-[#0B0A14] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-[#D4D0E0] placeholder:text-[#7A7490] focus:outline-none focus:border-[#E2B714]/40 focus:ring-1 focus:ring-[#E2B714]/20 transition-all duration-200 font-mono"
                />
              </div>

              {error && (
                <p className="text-xs text-[#FF4655] bg-[#FF4655]/8 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleJoinGame}
                disabled={!joinGameId.trim()}
                className="w-full py-3.5 rounded-lg bg-[#E2B714] hover:bg-[#E2B714]/90 text-[#0B0A14] font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Enter the Circle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
