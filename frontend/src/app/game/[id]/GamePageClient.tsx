"use client";

import { useEffect, useRef } from "react";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { GameProvider, useGame, createSystemMessage } from "@/lib/game-store";
import GameView from "@/components/GameView";
import { useGameSubscription } from "@/hooks/useGameSubscription";
import { MIST_PER_OCT } from "@/lib/constants";

interface GamePageClientProps {
  gameId: string;
}

function GameInitializer({ gameId }: { gameId: string }) {
  const account = useCurrentAccount();
  const { state, dispatch } = useGame();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (state.gameId === gameId) { initialized.current = true; return; }

    // Wait for wallet to be available
    const walletAddress = account?.address;
    if (!walletAddress) return;

    initialized.current = true;

    const configKey = `game-config-${gameId}`;
    const raw = sessionStorage.getItem(configKey);

    let stakeAmount = BigInt(1 * MIST_PER_OCT);
    let alias = "Player";
    let txDigest = "";
    let maxPlayers = 8;

    if (raw) {
      try {
        const config = JSON.parse(raw);
        stakeAmount = BigInt(Math.floor((config.stakeAmount ?? 1) * MIST_PER_OCT));
        alias = config.alias || "Player";
        txDigest = config.txDigest || "";
        maxPlayers = config.maxPlayers ?? 8;
      } catch { /* use defaults */ }
      sessionStorage.removeItem(configKey);
    }

    dispatch({
      type: "SET_GAME",
      payload: {
        gameId,
        phase: 0,
        round: 0,
        players: [
          { address: walletAddress, alias, isAi: false, isAlive: true, roleRevealed: false },
        ],
        chatHistory: [],
        votes: {},
        eliminatedThisRound: null,
        winner: null,
        hostAddress: walletAddress,
        stakeAmount,
        phaseEndTime: 0,
        maxPlayers,
      },
    });

    const txMsg = txDigest ? ` (tx: ${txDigest.slice(0, 12)}...)` : "";
    dispatch({
      type: "ADD_MESSAGE",
      payload: createSystemMessage(`Game created on-chain${txMsg}. Add AI agents and GO LIVE when ready.`),
    });
  }, [gameId, account, state.gameId, dispatch]);

  return null;
}

function GameWithSubscription({ gameId }: { gameId: string }) {
  useGameSubscription(gameId);
  return <GameView gameId={gameId} />;
}

export default function GamePageClient({ gameId }: GamePageClientProps) {
  return (
    <GameProvider>
      <GameInitializer gameId={gameId} />
      <GameWithSubscription gameId={gameId} />
    </GameProvider>
  );
}
