"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSuiClient } from "@onelabs/dapp-kit";
import { useGame, createSystemMessage } from "@/lib/game-store";
import type { Player } from "@/lib/ai-agents";
import {
  PHASE_LOBBY,
  PHASE_NIGHT,
  PHASE_DAY_DISCUSSION,
  PHASE_DAY_VOTING,
  PHASE_GAME_OVER,
  PHASE_NAMES,
} from "@/lib/constants";

const POLL_INTERVAL_MS = 3000;

interface OnChainGameObject {
  phase: number;
  round: number;
  host: string;
  stake_amount: string;
  max_players: number;
  players: Array<{
    addr: string;
    alias: string;
    is_ai: boolean;
    is_alive: boolean;
    role: number;
    role_revealed: boolean;
  }>;
  phase_end_time: string;
  winner: number; // 0 = none, 1 = villagers, 2 = werewolves
}

function parseOnChainGame(fields: OnChainGameObject): {
  phase: number;
  round: number;
  hostAddress: string;
  stakeAmount: bigint;
  players: Player[];
  phaseEndTime: number;
  winner: "villagers" | "werewolves" | null;
} {
  const players: Player[] = (fields.players ?? []).map((p) => ({
    address: p.addr,
    alias: p.alias,
    isAi: p.is_ai,
    isAlive: p.is_alive,
    role: p.role_revealed ? p.role : undefined,
    roleRevealed: p.role_revealed,
  }));

  let winner: "villagers" | "werewolves" | null = null;
  if (fields.winner === 1) winner = "villagers";
  if (fields.winner === 2) winner = "werewolves";

  return {
    phase: fields.phase ?? PHASE_LOBBY,
    round: fields.round ?? 0,
    hostAddress: fields.host ?? "",
    stakeAmount: BigInt(fields.stake_amount ?? "0"),
    players,
    phaseEndTime: Number(fields.phase_end_time ?? "0"),
    winner,
  };
}

export function useGameSubscription(gameId: string, pollInterval: number = POLL_INTERVAL_MS) {
  const client = useSuiClient();
  const { state, dispatch } = useGame();
  const prevPhaseRef = useRef<number>(state.phase);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGameState = useCallback(async () => {
    if (!gameId || gameId === "demo") return;

    try {
      const obj = await client.getObject({
        id: gameId,
        options: { showContent: true },
      });

      if (!obj.data?.content || obj.data.content.dataType !== "moveObject") {
        return;
      }

      const fields = obj.data.content.fields as unknown as OnChainGameObject;
      const parsed = parseOnChainGame(fields);

      // Update players if changed
      const currentAddresses = state.players.map((p) => p.address).sort().join(",");
      const newAddresses = parsed.players.map((p) => p.address).sort().join(",");

      if (currentAddresses !== newAddresses) {
        // Players changed — full replace
        dispatch({
          type: "SET_GAME",
          payload: {
            ...state,
            gameId,
            phase: parsed.phase,
            round: parsed.round,
            hostAddress: parsed.hostAddress,
            stakeAmount: parsed.stakeAmount,
            players: parsed.players,
            phaseEndTime: parsed.phaseEndTime,
            winner: parsed.winner,
          },
        });
      } else {
        // Update phase if changed
        if (parsed.phase !== state.phase) {
          dispatch({
            type: "SET_PHASE",
            payload: {
              phase: parsed.phase,
              phaseEndTime: parsed.phaseEndTime,
            },
          });

          // Add system message for phase change
          const phaseName = PHASE_NAMES[parsed.phase] ?? "Unknown";
          if (parsed.phase === PHASE_NIGHT) {
            dispatch({
              type: "ADD_MESSAGE",
              payload: createSystemMessage("Night falls. The werewolves awaken..."),
            });
          } else if (parsed.phase === PHASE_DAY_DISCUSSION) {
            dispatch({
              type: "ADD_MESSAGE",
              payload: createSystemMessage(
                "Dawn breaks. The village gathers to discuss."
              ),
            });
          } else if (parsed.phase === PHASE_DAY_VOTING) {
            dispatch({
              type: "ADD_MESSAGE",
              payload: createSystemMessage(
                "Time to vote. Choose who to eliminate."
              ),
            });
            dispatch({ type: "CLEAR_VOTES" });
          } else if (parsed.phase === PHASE_GAME_OVER) {
            const winnerText =
              parsed.winner === "villagers"
                ? "The village prevails!"
                : "The werewolves have won!";
            dispatch({
              type: "ADD_MESSAGE",
              payload: createSystemMessage(`Game Over. ${winnerText}`),
            });
          }
        }

        // Update round
        if (parsed.round !== state.round) {
          dispatch({ type: "SET_ROUND", payload: parsed.round });
        }

        // Update winner
        if (parsed.winner && parsed.winner !== state.winner) {
          dispatch({ type: "SET_WINNER", payload: parsed.winner });
        }

        // Update player statuses (alive/dead, role reveals)
        for (const newPlayer of parsed.players) {
          const existing = state.players.find(
            (p) => p.address === newPlayer.address
          );
          if (existing) {
            if (existing.isAlive && !newPlayer.isAlive) {
              dispatch({
                type: "ELIMINATE_PLAYER",
                payload: {
                  address: newPlayer.address,
                  role: newPlayer.role,
                },
              });
              dispatch({
                type: "ADD_MESSAGE",
                payload: createSystemMessage(
                  `${newPlayer.alias} has been eliminated.`
                ),
              });
            }
            if (!existing.roleRevealed && newPlayer.roleRevealed && newPlayer.role !== undefined) {
              dispatch({
                type: "REVEAL_ROLE",
                payload: { address: newPlayer.address, role: newPlayer.role },
              });
            }
          }
        }
      }

      prevPhaseRef.current = parsed.phase;
    } catch (err) {
      // Silently handle polling errors (network issues, etc.)
      console.warn("Game state poll error:", err);
    }
  }, [gameId, client, state, dispatch]);

  // Set up polling
  useEffect(() => {
    // Initial fetch
    fetchGameState();

    pollTimerRef.current = setInterval(fetchGameState, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchGameState, pollInterval]);

  // Subscribe to events if supported
  useEffect(() => {
    if (!gameId || gameId === "demo") return;

    let unsubscribe: (() => void) | null = null;

    async function subscribe() {
      try {
        const unsub = await client.subscribeEvent({
          filter: {
            MoveModule: {
              package: process.env.NEXT_PUBLIC_PACKAGE_ID ?? "",
              module: "game",
            },
          },
          onMessage: (event) => {
            // On any game event, trigger a fetch to update state
            fetchGameState();
          },
        });
        unsubscribe = unsub;
      } catch {
        // Event subscription may not be supported — polling is the fallback
      }
    }

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId, client, fetchGameState]);
}
