"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
  createElement,
} from "react";
import type { GameState, ChatMessage, Player } from "./ai-agents";
import { PHASE_LOBBY } from "./constants";

// Re-export types for convenience
export type { GameState, ChatMessage, Player };

// ---- Actions ----

export type GameAction =
  | { type: "SET_GAME"; payload: GameState }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_PHASE"; payload: { phase: number; phaseEndTime: number } }
  | { type: "CAST_VOTE"; payload: { voter: string; target: string } }
  | { type: "ELIMINATE_PLAYER"; payload: { address: string; role?: number } }
  | { type: "ADD_PLAYER"; payload: Player }
  | { type: "REMOVE_PLAYER"; payload: { address: string } }
  | { type: "SET_WINNER"; payload: "villagers" | "werewolves" }
  | { type: "SET_ROUND"; payload: number }
  | { type: "CLEAR_VOTES" }
  | { type: "REVEAL_ROLE"; payload: { address: string; role: number } }
  | { type: "SET_PHASE_END_TIME"; payload: number }
  | { type: "SET_ELIMINATED_THIS_ROUND"; payload: string | null }
  | { type: "RESET" };

// ---- Initial State ----

export const initialGameState: GameState = {
  gameId: "",
  phase: PHASE_LOBBY,
  round: 0,
  players: [],
  chatHistory: [],
  votes: {},
  eliminatedThisRound: null,
  winner: null,
  hostAddress: "",
  stakeAmount: BigInt(0),
  phaseEndTime: 0,
};

// ---- Reducer ----

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_GAME":
      return { ...action.payload };

    case "ADD_MESSAGE":
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.payload],
      };

    case "SET_PHASE":
      return {
        ...state,
        phase: action.payload.phase,
        phaseEndTime: action.payload.phaseEndTime,
      };

    case "CAST_VOTE":
      return {
        ...state,
        votes: {
          ...state.votes,
          [action.payload.voter]: action.payload.target,
        },
      };

    case "ELIMINATE_PLAYER":
      return {
        ...state,
        players: state.players.map((p) =>
          p.address === action.payload.address
            ? {
                ...p,
                isAlive: false,
                role: action.payload.role ?? p.role,
                roleRevealed: action.payload.role !== undefined ? true : p.roleRevealed,
              }
            : p
        ),
        eliminatedThisRound: action.payload.address,
      };

    case "ADD_PLAYER":
      return {
        ...state,
        players: [...state.players, action.payload],
      };

    case "REMOVE_PLAYER":
      return {
        ...state,
        players: state.players.filter(
          (p) => p.address !== action.payload.address
        ),
      };

    case "SET_WINNER":
      return {
        ...state,
        winner: action.payload,
      };

    case "SET_ROUND":
      return {
        ...state,
        round: action.payload,
      };

    case "CLEAR_VOTES":
      return {
        ...state,
        votes: {},
        eliminatedThisRound: null,
      };

    case "REVEAL_ROLE":
      return {
        ...state,
        players: state.players.map((p) =>
          p.address === action.payload.address
            ? { ...p, role: action.payload.role, roleRevealed: true }
            : p
        ),
      };

    case "SET_PHASE_END_TIME":
      return {
        ...state,
        phaseEndTime: action.payload,
      };

    case "SET_ELIMINATED_THIS_ROUND":
      return {
        ...state,
        eliminatedThisRound: action.payload,
      };

    case "RESET":
      return { ...initialGameState };

    default:
      return state;
  }
}

// ---- Context ----

interface GameContextType {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  return createElement(
    GameContext.Provider,
    { value: { state, dispatch } },
    children
  );
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

// ---- Helper: create a system message ----

export function createSystemMessage(content: string): ChatMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: "system",
    senderAlias: "System",
    content,
    timestamp: Date.now(),
    isAi: false,
    isSystem: true,
  };
}

// ---- Helper: create a player message ----

export function createPlayerMessage(
  sender: string,
  senderAlias: string,
  content: string,
  isAi: boolean
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    senderAlias,
    content,
    timestamp: Date.now(),
    isAi,
    isSystem: false,
  };
}
