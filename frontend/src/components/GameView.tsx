"use client";

import { useState, useCallback, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@onelabs/dapp-kit";
import { useGame, createPlayerMessage, createSystemMessage } from "@/lib/game-store";
import {
  PHASE_LOBBY,
  PHASE_NIGHT,
  PHASE_DAY_DISCUSSION,
  PHASE_DAY_VOTING,
  PHASE_GAME_OVER,
  PHASE_NAMES,
  ROLE_WEREWOLF,
} from "@/lib/constants";
import { castVoteTx, placeBetTx, addAiPlayerTx, startGameTx } from "@/lib/contracts";
import { useGameEngine } from "@/hooks/useGameEngine";
import GameLobby from "./GameLobby";
import GameChat from "./GameChat";
import VotingPanel from "./VotingPanel";
import BettingPanel from "./BettingPanel";
import PlayerList from "./PlayerList";
import GameResult from "./GameResult";
import PhaseTimer from "./PhaseTimer";

interface GameViewProps {
  gameId: string;
}

type MobileTab = "players" | "chat" | "action";

export default function GameView({ gameId }: GameViewProps) {
  const account = useCurrentAccount();
  const { state, dispatch } = useGame();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [isTyping, setIsTyping] = useState(false);
  const [typingAgentName, setTypingAgentName] = useState<string | undefined>();
  const [hasVoted, setHasVoted] = useState(false);

  // Reset hasVoted when votes are cleared (new voting round or runoff)
  useEffect(() => {
    if (state.phase === PHASE_DAY_VOTING && Object.keys(state.votes).length === 0) {
      setHasVoted(false);
    }
  }, [state.phase, state.votes]);

  const [activeBets, setActiveBets] = useState<
    { id: string; target: string; targetAlias: string; amount: bigint; timestamp: number }[]
  >([]);
  const [betPool, setBetPool] = useState<Record<string, bigint>>({});
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const { startGame: engineStartGame, wolfPickTarget, runoffCandidates } = useGameEngine();
  const currentAddress = account?.address ?? state.hostAddress;
  const currentPlayer = state.players.find((p) => p.address === currentAddress);
  const isHost = state.hostAddress === currentAddress;
  const alivePlayers = state.players.filter((p) => p.isAlive);
  const hasJoined = !!currentPlayer;

  // Handlers
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!currentPlayer) return;
      const msg = createPlayerMessage(
        currentAddress,
        currentPlayer.alias,
        content,
        false
      );
      dispatch({ type: "ADD_MESSAGE", payload: msg });
    },
    [currentAddress, currentPlayer, dispatch]
  );

  const handleVote = useCallback(
    (target: string) => {
      // Apply vote locally immediately
      dispatch({ type: "CAST_VOTE", payload: { voter: currentAddress, target } });
      setHasVoted(true);
      const targetPlayer = state.players.find((p) => p.address === target);
      dispatch({
        type: "ADD_MESSAGE",
        payload: createSystemMessage(
          `${currentPlayer?.alias ?? "Someone"} voted to eliminate ${targetPlayer?.alias ?? "unknown"}.`
        ),
      });

      // Fire on-chain vote in background
      if (account) {
        try {
          const tx = castVoteTx(gameId, target, state.round);
          signAndExecute({ transaction: tx }, {
            onSuccess: () => console.log("Vote cast on-chain"),
            onError: (err) => console.warn("On-chain vote failed:", err),
          });
        } catch { /* ignore */ }
      }
    },
    [gameId, account, state.round, state.players, currentAddress, currentPlayer, signAndExecute, dispatch]
  );

  const handlePlaceBet = useCallback(
    (target: string, amount: bigint) => {
      const bet = {
        id: `bet-${Date.now()}`,
        target,
        targetAlias: target === "villagers" ? "Village wins" : "Wolves win",
        amount,
        timestamp: Date.now(),
      };
      setActiveBets((prev) => [...prev, bet]);
      setBetPool((prev) => ({
        ...prev,
        [target]: (prev[target] ?? BigInt(0)) + amount,
      }));
    },
    []
  );

  const handleAddAiPlayer = useCallback(
    (alias: string, _personalityIndex: number) => {
      // Add locally immediately for instant feedback
      const fakeAddress = `0xai${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      dispatch({
        type: "ADD_PLAYER",
        payload: { address: fakeAddress, alias, isAi: true, isAlive: true, roleRevealed: false },
      });
      dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage(`${alias} (AI) has joined the game.`) });

      // Fire contract call in background (don't block UI)
      if (account) {
        try {
          const tx = addAiPlayerTx(gameId, alias);
          signAndExecute({ transaction: tx }, {
            onSuccess: () => console.log(`AI ${alias} added on-chain`),
            onError: (err) => console.warn(`On-chain add AI ${alias} failed:`, err),
          });
        } catch { /* ignore */ }
      }
    },
    [account, gameId, signAndExecute, dispatch]
  );

  const handleStartGame = useCallback(() => {
    // Start game locally immediately
    engineStartGame();

    // Fire contract call in background
    if (account) {
      try {
        const tx = startGameTx(gameId);
        signAndExecute({ transaction: tx }, {
          onSuccess: () => console.log("Game started on-chain"),
          onError: (err) => console.warn("On-chain start failed:", err),
        });
      } catch { /* ignore */ }
    }
  }, [account, gameId, signAndExecute, engineStartGame]);

  const handleJoinGame = useCallback(
    (alias: string) => {
      if (!currentAddress) return;
      dispatch({
        type: "ADD_PLAYER",
        payload: {
          address: currentAddress,
          alias,
          isAi: false,
          isAlive: true,
          roleRevealed: false,
        },
      });
      dispatch({
        type: "ADD_MESSAGE",
        payload: createSystemMessage(`${alias} has joined the game.`),
      });
    },
    [currentAddress, dispatch]
  );

  // Lobby phase
  if (state.phase === PHASE_LOBBY) {
    return (
      <GameLobby
        gameId={gameId}
        isHost={isHost}
        currentPlayerAddress={currentAddress}
        onAddAiPlayer={handleAddAiPlayer}
        onStartGame={handleStartGame}
        onJoinGame={handleJoinGame}
        hasJoined={hasJoined}
        stakeAmount={state.stakeAmount}
        maxPlayers={state.maxPlayers ?? 8}
      />
    );
  }

  const isNight = state.phase === PHASE_NIGHT;
  const phaseName = PHASE_NAMES[state.phase] ?? "Unknown";
  const deadCount = state.players.filter((p) => !p.isAlive).length;

  return (
    <div className="h-screen flex flex-col bg-[#0B0A14] overflow-hidden relative">
      {/* Night overlay */}
      {isNight && (() => {
        const isPlayerWolf = currentPlayer?.role === ROLE_WEREWOLF && currentPlayer?.isAlive;
        const nightTargets = state.players.filter(p => p.isAlive && p.role !== ROLE_WEREWOLF);

        return (
          <div className={`absolute inset-0 z-30 transition-opacity duration-1000 ${isPlayerWolf ? "" : "pointer-events-none"}`}>
            <div className="absolute inset-0" style={{ background: "#070610", opacity: 0.92 }} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                opacity: 0.04,
                animation: "standbyNoise 4s steps(5) infinite",
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-6 text-center w-full max-w-lg px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ShadowPack" className="night-wolf-icon" width={96} height={96} style={{ objectFit: "contain", opacity: 0.7 }} />

              <h2
                className="crimson text-4xl lg:text-5xl tracking-wider"
                style={{ color: isPlayerWolf ? "var(--red)" : "var(--text)", letterSpacing: "4px" }}
              >
                {isPlayerWolf ? "Choose Your Prey" : "Night Falls"}
              </h2>

              <p className="text-base" style={{ color: "var(--muted-color)", maxWidth: 400 }}>
                {isPlayerWolf
                  ? "Select a villager to eliminate. The pack hunts together."
                  : "The wolves are choosing their prey. Wait for dawn..."
                }
              </p>

              {/* Werewolf target picker */}
              {isPlayerWolf && (
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {nightTargets.map(target => (
                    <button
                      key={target.address}
                      onClick={() => wolfPickTarget(target.address)}
                      className="flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 group"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 group-hover:border-[var(--red)] group-hover:shadow-[0_0_20px_rgba(255,70,85,0.3)]"
                        style={{
                          background: "var(--surface)",
                          borderColor: "rgba(122,116,144,0.2)",
                          color: "var(--muted-color)",
                        }}
                      >
                        {target.alias.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs" style={{ color: "var(--muted-color)" }}>{target.alias}</span>
                      {/* Skull overlay on hover */}
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--red)" }}>
                        Kill
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!isPlayerWolf && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="live-dot amber" />
                  <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#f59e0b" }}>Standby</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Top chyron bar (broadcast-style) */}
      <div
        className="chyron z-40 relative"
        style={{
          borderBottom: "1px solid rgba(226,183,20,0.12)",
          background: "linear-gradient(90deg, var(--surface) 0%, transparent 100%)",
          padding: "12px 24px",
        }}
      >
        <span className="chyron-title">
          {isNight ? "Night" : `Day ${state.round}`} &mdash; {phaseName}
        </span>

        {/* Phase timer */}
        <PhaseTimer
          phase={state.phase}
          phaseEndTime={state.phaseEndTime}
          round={state.round}
        />

        <span className="live-label"><span className="live-dot" /> LIVE</span>

        <span className="chyron-meta flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--green)" }} />
            <span className="tabular-nums">{alivePlayers.length} Alive</span>
          </span>
          {deadCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--red)" }} />
              <span className="tabular-nums">{deadCount} Dead</span>
            </span>
          )}
        </span>

        <a
          href="/game"
          className="text-xs transition-colors duration-200 ml-2"
          style={{ color: "var(--muted-color)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-color)")}
        >
          Exit
        </a>
      </div>

      {/* Desktop layout: 3 panels (broadcast style) */}
      <div className="flex-1 flex overflow-hidden" style={{ padding: "16px 0" }}>
        {/* Left sidebar: Players (220px) */}
        <div
          className="w-[220px] overflow-y-auto hidden md:flex flex-col flex-shrink-0"
          style={{
            background: "var(--surface)",
            borderRight: "1px solid rgba(122,116,144,0.08)",
            borderRadius: "14px 0 0 14px",
          }}
        >
          <div className="p-4 flex-1">
            <PlayerList
              players={state.players}
              currentPlayerAddress={currentAddress}
            />
          </div>
        </div>

        {/* Center: Chat (flex) */}
        <div
          className="flex-1 flex flex-col min-w-0 hidden md:flex"
          style={{ background: "rgba(22,21,37,0.5)" }}
        >
          <GameChat
            currentPlayerAddress={currentAddress}
            currentPlayerAlias={currentPlayer?.alias ?? "Spectator"}
            isTyping={isTyping}
            typingAgentName={typingAgentName}
            onSendMessage={handleSendMessage}
            isPlayerAlive={currentPlayer?.isAlive ?? false}
          />
        </div>

        {/* Right sidebar: Voting / Betting */}
        <div
          className="overflow-y-auto hidden md:flex flex-col flex-shrink-0"
          style={{
            width: (currentPlayer && !currentPlayer.isAlive) ? 280 : (state.phase === PHASE_DAY_VOTING ? 280 : 260),
            background: "var(--surface)",
            borderLeft: "1px solid rgba(122,116,144,0.08)",
            borderRadius: "0 14px 14px 0",
          }}
        >
          <div className="p-4 flex-1 flex flex-col">
            {(() => {
              const playerDead = currentPlayer && !currentPlayer.isAlive;

              if (playerDead) {
                // Dead players can only bet
                return (
                  <BettingPanel
                    alivePlayers={alivePlayers}
                    onPlaceBet={handlePlaceBet}
                    activeBets={activeBets}
                    totalBetPool={betPool}
                  />
                );
              }

              if (state.phase === PHASE_DAY_VOTING) {
                return (
                  <VotingPanel
                    alivePlayers={alivePlayers}
                    currentPlayerAddress={currentAddress}
                    onVote={handleVote}
                    hasVoted={hasVoted}
                    round={state.round}
                    isPlayerAlive={currentPlayer?.isAlive ?? true}
                    runoffCandidates={runoffCandidates.current}
                  />
                );
              }

              // During discussion/night — show game info
              return (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="var(--gold)" style={{ opacity: 0.3 }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <p className="text-xs" style={{ color: "var(--muted-color)" }}>
                    {state.phase === PHASE_NIGHT ? "Night phase — waiting for dawn..." : "Discussion in progress — voting opens soon"}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Mobile: tab content */}
      <div className="flex-1 flex flex-col min-w-0 md:hidden overflow-hidden">
        {mobileTab === "players" && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#161525]">
            <PlayerList
              players={state.players}
              currentPlayerAddress={currentAddress}
            />
          </div>
        )}
        {mobileTab === "chat" && (
          <GameChat
            currentPlayerAddress={currentAddress}
            currentPlayerAlias={currentPlayer?.alias ?? "Spectator"}
            isTyping={isTyping}
            typingAgentName={typingAgentName}
            onSendMessage={handleSendMessage}
            isPlayerAlive={currentPlayer?.isAlive ?? false}
          />
        )}
        {mobileTab === "action" && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#161525]">
            {currentPlayer && !currentPlayer.isAlive ? (
              <BettingPanel
                alivePlayers={alivePlayers}
                onPlaceBet={handlePlaceBet}
                activeBets={activeBets}
                totalBetPool={betPool}
              />
            ) : state.phase === PHASE_DAY_VOTING ? (
              <VotingPanel
                alivePlayers={alivePlayers}
                currentPlayerAddress={currentAddress}
                onVote={handleVote}
                hasVoted={hasVoted}
                round={state.round}
                isPlayerAlive={currentPlayer?.isAlive ?? true}
                runoffCandidates={runoffCandidates.current}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: "var(--muted-color)" }}>Voting opens after discussion</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden flex border-t border-white/[0.06] bg-[#161525]">
        <MobileTabButton
          label="Players"
          active={mobileTab === "players"}
          onClick={() => setMobileTab("players")}
        >
          <PlayersIcon />
        </MobileTabButton>
        <MobileTabButton
          label="Chat"
          active={mobileTab === "chat"}
          onClick={() => setMobileTab("chat")}
        >
          <ChatIcon />
        </MobileTabButton>
        <MobileTabButton
          label={currentPlayer && !currentPlayer.isAlive ? "Bet" : state.phase === PHASE_DAY_VOTING ? "Vote" : "Info"}
          active={mobileTab === "action"}
          onClick={() => setMobileTab("action")}
        >
          {state.phase === PHASE_DAY_VOTING ? <VoteIcon /> : <BetIcon />}
        </MobileTabButton>
      </div>

      {/* Game over overlay */}
      {state.phase === PHASE_GAME_OVER && state.winner && (
        <GameResult
          gameId={gameId}
          onPlayAgain={() => {
            // Reset but keep the player and host info
            const alias = currentPlayer?.alias ?? "Player";
            dispatch({ type: "RESET" });
            dispatch({
              type: "SET_GAME",
              payload: {
                gameId,
                phase: PHASE_LOBBY,
                round: 0,
                players: [
                  { address: currentAddress, alias, isAi: false, isAlive: true, roleRevealed: false },
                ],
                chatHistory: [],
                votes: {},
                eliminatedThisRound: null,
                winner: null,
                hostAddress: currentAddress,
                stakeAmount: state.stakeAmount,
                phaseEndTime: 0,
                maxPlayers: state.maxPlayers,
              },
            });
          }}
        />
      )}
    </div>
  );
}

/* ---- Mobile tab button ---- */

function MobileTabButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-200 relative ${
        active
          ? "text-[#E2B714]"
          : "text-[#7A7490] hover:text-[#D4D0E0]"
      }`}
    >
      <div className="w-5 h-5">{children}</div>
      <span className="text-[10px] font-medium">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E2B714] rounded-full" />
      )}
    </button>
  );
}

/* ---- Icons ---- */

function PlayersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function BetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.798 7.45c.512-.67 1.135-.95 1.702-.95s1.19.28 1.702.95a.75.75 0 001.192-.91C12.637 5.55 11.5 5 10.5 5s-2.137.55-2.894 1.54A5.205 5.205 0 006.5 10c0 1.292.443 2.507 1.106 3.46C8.363 14.45 9.5 15 10.5 15s2.137-.55 2.894-1.54a.75.75 0 00-1.192-.91c-.512.67-1.135.95-1.702.95s-1.19-.28-1.702-.95A3.705 3.705 0 018 10c0-.862.32-1.753.798-2.55z" clipRule="evenodd" />
    </svg>
  );
}
