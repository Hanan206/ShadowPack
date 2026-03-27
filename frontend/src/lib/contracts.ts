import { Transaction } from "@onelabs/sui/transactions";
import { PACKAGE_ID, MODULE_NAME, CLOCK_ID } from "./constants";

/**
 * Create a new game lobby
 */
export function createGameTx(stakeAmount: bigint, maxPlayers: number): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "create_game",
    arguments: [
      tx.pure.u64(stakeAmount),
      tx.pure.u8(maxPlayers),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Join an existing game lobby
 */
export function joinGameTx(
  gameId: string,
  stakeAmount: bigint,
  alias: string
): Transaction {
  const tx = new Transaction();
  const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(stakeAmount)]);
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "join_game",
    arguments: [
      tx.object(gameId),
      stakeCoin,
      tx.pure.string(alias),
    ],
  });
  return tx;
}

/**
 * Add an AI-controlled player (host only)
 */
export function addAiPlayerTx(gameId: string, alias: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "add_ai_player",
    arguments: [
      tx.object(gameId),
      tx.pure.string(alias),
    ],
  });
  return tx;
}

/**
 * Start the game (host only, when enough players have joined)
 */
export function startGameTx(gameId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "start_game",
    arguments: [
      tx.object(gameId),
    ],
  });
  return tx;
}

/**
 * Cast a vote during the voting phase
 */
export function castVoteTx(
  gameId: string,
  target: string,
  round: number
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "cast_vote",
    arguments: [
      tx.object(gameId),
      tx.pure.address(target),
      tx.pure.u8(round),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Perform a night action (werewolf kill, seer peek, doctor heal)
 */
export function nightActionTx(gameId: string, target: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "night_action",
    arguments: [
      tx.object(gameId),
      tx.pure.address(target),
    ],
  });
  return tx;
}

/**
 * Eliminate a player after vote tally (called by game host/admin)
 */
export function eliminatePlayerTx(gameId: string, target: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "eliminate_player",
    arguments: [
      tx.object(gameId),
      tx.pure.address(target),
    ],
  });
  return tx;
}

/**
 * Advance the game to the next phase
 */
export function advancePhaseTx(gameId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "advance_phase",
    arguments: [
      tx.object(gameId),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Place a spectator bet on who is the werewolf
 */
export function placeBetTx(
  gameId: string,
  target: string,
  amount: bigint
): Transaction {
  const tx = new Transaction();
  const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "place_bet",
    arguments: [
      tx.object(gameId),
      tx.pure.address(target),
      betCoin,
    ],
  });
  return tx;
}

/**
 * Settle bets after game ends
 */
export function settleBetsTx(gameId: string, betId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    package: PACKAGE_ID,
    module: MODULE_NAME,
    function: "settle_bets",
    arguments: [
      tx.object(gameId),
      tx.object(betId),
    ],
  });
  return tx;
}
