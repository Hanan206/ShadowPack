export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_PACKAGE_ID ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const CLOCK_ID = "0x6";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-testnet.onelabs.cc:443";
export const EXPLORER_URL = "https://onescan.cc/testnet";
export const FAUCET_URL = "https://faucet-testnet.onelabs.cc:443";
export const MODULE_NAME = "game";
export const OCT_DECIMALS = 9;
export const MIST_PER_OCT = 1_000_000_000;

// Phase constants matching Move contract
export const PHASE_LOBBY = 0;
export const PHASE_NIGHT = 1;
export const PHASE_DAY_DISCUSSION = 2;
export const PHASE_DAY_VOTING = 3;
export const PHASE_GAME_OVER = 4;

export const PHASE_NAMES: Record<number, string> = {
  [PHASE_LOBBY]: "Lobby",
  [PHASE_NIGHT]: "Night",
  [PHASE_DAY_DISCUSSION]: "Discussion",
  [PHASE_DAY_VOTING]: "Voting",
  [PHASE_GAME_OVER]: "Game Over",
};

// Role constants
export const ROLE_VILLAGER = 0;
export const ROLE_WEREWOLF = 1;
export const ROLE_SEER = 2;
export const ROLE_DOCTOR = 3;

export const ROLE_NAMES: Record<number, string> = {
  0: "Villager",
  1: "Werewolf",
  2: "Seer",
  3: "Doctor",
};

export const ROLE_COLORS: Record<number, string> = {
  0: "#94a3b8",
  1: "#ef4444",
  2: "#8b5cf6",
  3: "#22c55e",
};

export const ROLE_EMOJIS: Record<number, string> = {
  0: "\u{1F9D1}",
  1: "\u{1F43A}",
  2: "\u{1F52E}",
  3: "\u{1FA7A}",
};

// Game configuration
export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 12;
export const DISCUSSION_DURATION_SECONDS = 120;
export const VOTING_DURATION_SECONDS = 60;
export const NIGHT_DURATION_SECONDS = 30;
