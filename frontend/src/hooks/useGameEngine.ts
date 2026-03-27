"use client";

import { useCallback, useRef, useEffect } from "react";
import { useGame, createSystemMessage, createPlayerMessage } from "@/lib/game-store";
import { AGENT_PERSONALITIES } from "@/lib/ai-agents";
import type { Player } from "@/lib/ai-agents";
import {
  PHASE_LOBBY,
  PHASE_NIGHT,
  PHASE_DAY_DISCUSSION,
  PHASE_DAY_VOTING,
  PHASE_GAME_OVER,
  ROLE_VILLAGER,
  ROLE_WEREWOLF,
  ROLE_SEER,
  ROLE_DOCTOR,
  ROLE_NAMES,
} from "@/lib/constants";

/*
 GAME SEQUENCE:
 1. Start → roles assigned → first night kill (auto, story intro)
 2. Day Discussion → players chat, accuse
 3. Day Voting → players vote to eliminate someone (most votes dies)
 4. Check win: wolf voted out? villagers win. Otherwise continue.
 5. Night → wolf picks prey → prey eliminated
 6. Check win: wolves >= villagers? wolves win. Otherwise back to step 2.
*/

// ─── Timing ──────────────────────────────────────────────────
const NIGHT_TIME = 15;
const DISCUSSION_TIME = 30;
const VOTING_TIME = 45;
const AI_CHAT_GAP_MIN = 3000;
const AI_CHAT_GAP_MAX = 5000;
const AI_VOTE_GAP = 2500;

// ─── Helpers ─────────────────────────────────────────────────
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPersonality(alias: string) {
  return AGENT_PERSONALITIES.find((a) => a.name === alias);
}

// ─── Role Assignment ─────────────────────────────────────────
function assignRoles(players: Player[]): Player[] {
  const count = players.length;
  // 1 wolf for <12 players, 2 wolves at 12
  const wwCount = count >= 12 ? 2 : 1;

  const rolePool: number[] = [];
  for (let i = 0; i < wwCount; i++) rolePool.push(ROLE_WEREWOLF);
  rolePool.push(ROLE_SEER);
  rolePool.push(ROLE_DOCTOR);
  while (rolePool.length < count) rolePool.push(ROLE_VILLAGER);

  // Shuffle
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
  }

  return players.map((p, i) => ({ ...p, role: rolePool[i] }));
}

// ─── Win condition check ─────────────────────────────────────
function checkWin(players: Player[]): "villagers" | "werewolves" | null {
  const alive = players.filter(p => p.isAlive);
  const wolves = alive.filter(p => p.role === ROLE_WEREWOLF);
  const villagers = alive.filter(p => p.role !== ROLE_WEREWOLF);

  if (wolves.length === 0) return "villagers";
  if (wolves.length >= villagers.length) return "werewolves";
  return null;
}

// ─── Chat lines ──────────────────────────────────────────────
function accusationLine(style: string, targetAlias: string, allAliases: string[]): string {
  const other = allAliases.filter(a => a !== targetAlias);
  const rando = other.length > 0 ? pickRandom(other) : "someone";

  const lines: Record<string, string[]> = {
    analytical: [
      `I've been watching @${targetAlias} closely. Their silence during the last vote was telling.`,
      `The numbers don't lie — @${targetAlias} switched their vote at the last second.`,
      `@${targetAlias}, explain why you voted against ${rando} when the evidence pointed elsewhere.`,
      `Something @${targetAlias} said earlier doesn't add up. I'm keeping my eye on them.`,
    ],
    emotional: [
      `I don't trust @${targetAlias} AT ALL! Something about them feels WRONG!`,
      `@${targetAlias}, why are you so calm?! An innocent person would be MORE worried!`,
      `Leave @${rando} alone! If anyone is suspicious, it's @${targetAlias}!`,
      `@${targetAlias} defended the eliminated player too quickly. That's NOT normal!`,
    ],
    aggressive: [
      `@${targetAlias}. Stand up. Explain yourself. NOW.`,
      `I'm calling it — @${targetAlias} is the wolf. Prove me wrong.`,
      `Everyone voting for @${rando} is wrong. Look at @${targetAlias} — THAT'S your wolf.`,
      `@${targetAlias}, why did you change your story? First you accused ${rando}, now you're silent.`,
    ],
    quiet: [
      `...@${targetAlias}. Why so quiet?`,
      `I noticed @${targetAlias} and ${rando} never accuse each other. Interesting.`,
      `The wolf is @${targetAlias}. I've been watching.`,
      `@${targetAlias} reacted too fast when ${rando} was accused. Just saying.`,
    ],
    humorous: [
      `If @${targetAlias} is innocent, then I'm the Queen of England!`,
      `@${targetAlias} over here acting like they've never seen a werewolf before. Suspicious much?`,
      `I have a joke: @${targetAlias}'s alibi. That's it. That's the joke.`,
      `@${targetAlias}, your poker face needs work. I can see the wolf ears from here!`,
    ],
    paranoid: [
      `@${targetAlias} and @${rando} are working TOGETHER. I can SEE it!`,
      `@${targetAlias} is the mastermind. They've been pulling strings since round one!`,
      `I'm telling you — @${targetAlias} orchestrated last night's kill!`,
      `Trust NOBODY, especially @${targetAlias}. They've been too helpful. It's a trap!`,
    ],
  };
  return pickRandom(lines[style] || lines.analytical);
}

const WOLF_DEFLECTION = (other: string, scapegoat: string) => [
  `Has anyone looked at @${scapegoat}? Something's off there.`,
  `Let's not jump to conclusions. I think we should focus on @${scapegoat} instead.`,
  `I've been analyzing everyone and honestly @${scapegoat} is way more suspicious than @${other}.`,
  `The REAL wolf is @${scapegoat}, mark my words.`,
  `I agree something is wrong, but @${scapegoat} is the one we should be watching.`,
];

const DEFENSE = (style: string, accuser: string): string => {
  const lines: Record<string, string[]> = {
    analytical: [`Nice try @${accuser}. Zero evidence. I've been the most transparent player here.`, `@${accuser}, you're deflecting. What have YOU done for the village?`],
    emotional: [`@${accuser}, how DARE you! I've been fighting for this village since round one!`, `You're playing right into the wolves' hands by coming after ME, @${accuser}!`],
    aggressive: [`@${accuser}, you want to point fingers? Let's talk about YOUR voting record.`, `@${accuser} is desperate. Accusing me is a smokescreen!`],
    quiet: [`...@${accuser} protests too much.`, `The one accusing is often the one hiding, @${accuser}.`],
    humorous: [`@${accuser}, if I was the wolf I'd be WAY better at hiding it!`, `Accusing the comedian? Classic wolf move, @${accuser}!`],
    paranoid: [`I KNEW @${accuser} was coming after me — planned from the start!`, `@${accuser} is part of the conspiracy!`],
  };
  return pickRandom(lines[style] || lines.analytical);
};

const AGREE = (style: string, accuser: string, target: string): string => {
  const lines: Record<string, string[]> = {
    analytical: [`@${accuser} makes a valid point. @${target}'s behavior has been inconsistent.`],
    emotional: [`YES! Finally someone sees it! @${target} has been sketchy this WHOLE TIME!`],
    aggressive: [`I back @${accuser}. @${target}, start talking or start packing.`],
    quiet: [`...@${accuser} sees it too. @${target}.`],
    humorous: [`Even a blind person could see @${target} is sus. Good catch @${accuser}!`],
    paranoid: [`@${accuser} confirms my theory! @${target} has been the wolf from DAY ONE!`],
  };
  return pickRandom(lines[style] || lines.analytical);
};

const DISAGREE = (style: string, accuser: string, target: string): string => {
  const lines: Record<string, string[]> = {
    analytical: [`Hold on @${accuser}. The evidence against @${target} is circumstantial. What's YOUR agenda?`],
    emotional: [`STOP going after @${target}! @${accuser}, you're being unfair!`],
    aggressive: [`Back off @${target}, @${accuser}. Unless you want ME digging into YOUR past votes.`],
    quiet: [`...wrong target, @${accuser}.`],
    humorous: [`@${accuser}, accusing @${target}? That's the plot twist nobody asked for!`],
    paranoid: [`WHY is @${accuser} so eager to eliminate @${target}?! That's what a WOLF would do!`],
  };
  return pickRandom(lines[style] || lines.analytical);
};

// ─── STORY INTROS ────────────────────────────────────────────
const NIGHT_KILL_STORIES = [
  (victim: string) => `The village wakes to a horrifying discovery. @${victim} was found lifeless at dawn, claw marks across the door. The werewolf has struck.`,
  (victim: string) => `Screams echo through the village at first light. @${victim} is gone — taken by the beast in the night. The hunt begins.`,
  (victim: string) => `Dawn reveals a grim scene. @${victim} never made it through the night. The werewolf is among you.`,
  (victim: string) => `The village bell tolls at sunrise. @${victim} has been claimed by the darkness. Someone here is responsible.`,
];

// ═════════════════════════════════════════════════════════════
export function useGameEngine() {
  const { state, dispatch } = useGame();
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const aiChatIndexRef = useRef(0);
  const nightResolvedRef = useRef(false);
  const runoffCandidatesRef = useRef<string[]>([]); // addresses of tied players in a runoff

  const clearTimers = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    chatTimersRef.current.forEach(t => clearTimeout(t));
    chatTimersRef.current = [];
  }, []);

  // ─── Start game ─────────────────────────────────────────────
  const startGame = useCallback(() => {
    const playersWithRoles = assignRoles(state.players);

    // First night: a NON-PLAYER villager is killed (story intro, no real player dies)
    const NPC_VICTIMS = ["Old Man Aldric", "The Blacksmith's Daughter", "Farmer Holt", "Sister Maren", "The Innkeeper", "Young Tobias"];
    const npcVictim = pickRandom(NPC_VICTIMS);

    // Show role to human player
    const humanPlayer = playersWithRoles.find(p => !p.isAi);
    const roleName = humanPlayer?.role !== undefined ? ROLE_NAMES[humanPlayer.role] : "Villager";
    const roleDesc: Record<number, string> = {
      [ROLE_VILLAGER]: "Find and vote out the werewolf before it's too late.",
      [ROLE_WEREWOLF]: "You are the WEREWOLF. Eliminate villagers at night. Blend in during the day.",
      [ROLE_SEER]: "You can sense the truth. Use your knowledge wisely during discussions.",
      [ROLE_DOCTOR]: "You have the power to save lives. Protect the village.",
    };

    dispatch({
      type: "SET_GAME",
      payload: {
        ...state,
        players: playersWithRoles, // all players alive
        phase: PHASE_DAY_DISCUSSION,
        round: 1,
        phaseEndTime: Date.now() + DISCUSSION_TIME * 1000,
      },
    });

    // Story intro — NPC killed, not a real player
    dispatch({
      type: "ADD_MESSAGE",
      payload: createSystemMessage(pickRandom(NIGHT_KILL_STORIES)(npcVictim)),
    });

    setTimeout(() => {
      dispatch({
        type: "ADD_MESSAGE",
        payload: createSystemMessage(`${npcVictim} was a beloved villager. A werewolf lurks among you. Find them before it's too late.`),
      });
    }, 1500);

    // Role reveal
    setTimeout(() => {
      if (humanPlayer && humanPlayer.role !== undefined) {
        dispatch({
          type: "ADD_MESSAGE",
          payload: createSystemMessage(`🎭 YOUR ROLE: ${roleName.toUpperCase()} — ${roleDesc[humanPlayer.role!]}`),
        });

        if (humanPlayer.role === ROLE_WEREWOLF) {
          const fellowWolves = playersWithRoles.filter(p => p.role === ROLE_WEREWOLF && p.address !== humanPlayer.address);
          if (fellowWolves.length > 0) {
            dispatch({
              type: "ADD_MESSAGE",
              payload: createSystemMessage(`🐺 Your fellow wolf: ${fellowWolves.map(w => w.alias).join(", ")}`),
            });
          }
        }
      }
    }, 3000);

    nightResolvedRef.current = false;
  }, [state, dispatch]);

  // ─── Night: werewolf picks prey ─────────────────────────────
  const wolfPickTarget = useCallback((targetAddress: string) => {
    if (nightResolvedRef.current) return;
    nightResolvedRef.current = true;

    const target = state.players.find(p => p.address === targetAddress);
    if (!target) return;

    // Doctor save (20% chance)
    const alivePlayers = state.players.filter(p => p.isAlive);
    const doctor = alivePlayers.find(p => p.role === ROLE_DOCTOR);
    const saved = doctor && Math.random() < 0.2;

    setTimeout(() => {
      if (saved) {
        dispatch({
          type: "ADD_MESSAGE",
          payload: createSystemMessage("Dawn breaks. Everyone survived the night — the Doctor saved a life!"),
        });
      } else {
        dispatch({
          type: "ELIMINATE_PLAYER",
          payload: { address: target.address, role: target.role },
        });
        dispatch({
          type: "ADD_MESSAGE",
          payload: createSystemMessage(pickRandom(NIGHT_KILL_STORIES)(target.alias)),
        });
        setTimeout(() => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: createSystemMessage(`${target.alias} was a ${ROLE_NAMES[target.role ?? 0]}.`),
          });
        }, 1500);
      }

      // Check win
      const remaining = state.players.filter(p => p.isAlive).filter(p => saved ? true : p.address !== target.address);
      const winner = checkWin(remaining.length > 0 ? remaining : state.players);

      if (winner) {
        setTimeout(() => {
          dispatch({ type: "SET_WINNER", payload: winner });
          dispatch({ type: "SET_PHASE", payload: { phase: PHASE_GAME_OVER, phaseEndTime: 0 } });
          dispatch({
            type: "ADD_MESSAGE",
            payload: createSystemMessage(winner === "villagers" ? "All werewolves eliminated! The village wins!" : "The werewolves have taken over. The pack wins!"),
          });
        }, 2000);
        return;
      }

      // Move to discussion
      setTimeout(() => {
        dispatch({
          type: "SET_PHASE",
          payload: { phase: PHASE_DAY_DISCUSSION, phaseEndTime: Date.now() + DISCUSSION_TIME * 1000 },
        });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("The village gathers. Discuss — who is the werewolf?") });
      }, 3000);
    }, 2000);
  }, [state.players, dispatch]);

  // ─── Auto night resolve (AI wolves / timeout) ──────────────
  const autoNightResolve = useCallback(() => {
    if (nightResolvedRef.current) return;
    const nonWolves = state.players.filter(p => p.isAlive && p.role !== ROLE_WEREWOLF);
    if (nonWolves.length > 0) wolfPickTarget(pickRandom(nonWolves).address);
  }, [state.players, wolfPickTarget]);

  // ─── AI chat ───────────────────────────────────────────────
  // ─── Fetch AI response from Groq API ────────────────────────
  const fetchAiResponseOnce = useCallback(async (
    personalityIndex: number,
    isWerewolf: boolean,
  ): Promise<string | null> => {
    try {
      const serializedState = {
        ...state,
        stakeAmount: state.stakeAmount.toString(),
      };

      const res = await fetch(`/api/game/${state.gameId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentIndex: personalityIndex,
          personalityIndex,
          gameState: serializedState,
          chatHistory: state.chatHistory.slice(-15),
          isWerewolf,
        }),
      });

      if (!res.ok) return null;

      const reader = res.body?.getReader();
      if (!reader) return null;

      let fullText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.text) fullText += parsed.text;
            if (parsed.done) break;
          } catch { /* skip */ }
        }
      }

      return fullText.trim() || null;
    } catch {
      return null;
    }
  }, [state]);

  // Retry wrapper — tries twice before giving up
  const fetchAiResponse = useCallback(async (
    personalityIndex: number,
    isWerewolf: boolean,
  ): Promise<string | null> => {
    const first = await fetchAiResponseOnce(personalityIndex, isWerewolf);
    if (first) return first;
    // Second attempt
    const second = await fetchAiResponseOnce(personalityIndex, isWerewolf);
    return second;
  }, [fetchAiResponseOnce]);

  // ─── Hardcoded fallback line ───────────────────────────────
  const getFallbackLine = useCallback((speaker: Player, othersAlive: Player[]): string => {
    const personality = getPersonality(speaker.alias);
    const style = personality?.style ?? "analytical";
    const isWolf = speaker.role === ROLE_WEREWOLF;
    const aliveAliases = othersAlive.map(p => p.alias);

    if (isWolf) {
      const nonWolves = othersAlive.filter(p => p.role !== ROLE_WEREWOLF);
      const scapegoat = nonWolves.length > 0 ? pickRandom(nonWolves) : pickRandom(othersAlive);
      const other = othersAlive.find(p => p.address !== scapegoat.address) || pickRandom(othersAlive);
      return pickRandom(WOLF_DEFLECTION(other.alias, scapegoat.alias));
    }
    return accusationLine(style, pickRandom(othersAlive).alias, aliveAliases);
  }, []);

  const simulateAiChat = useCallback(async () => {
    const aiPlayers = state.players.filter(p => p.isAi && p.isAlive);
    if (aiPlayers.length === 0 || state.phase !== PHASE_DAY_DISCUSSION) return;

    const alivePlayers = state.players.filter(p => p.isAlive);
    const recentMsgs = state.chatHistory.filter(m => !m.isSystem).slice(-6);
    const lastMsg = recentMsgs.length > 0 ? recentMsgs[recentMsgs.length - 1] : null;

    // Pick speaker: prioritize accused agents, then quiet ones
    const accusedInLast = lastMsg
      ? aiPlayers.find(p => lastMsg.content.includes(`@${p.alias}`) && lastMsg.sender !== p.address)
      : null;
    const recentSpeakers = new Set(recentMsgs.map(m => m.sender));
    const quietAgents = aiPlayers.filter(p => !recentSpeakers.has(p.address));

    let speaker: Player;
    if (accusedInLast && Math.random() < 0.7) speaker = accusedInLast;
    else if (quietAgents.length > 0) speaker = pickRandom(quietAgents);
    else speaker = aiPlayers[aiChatIndexRef.current % aiPlayers.length];

    const personalityIndex = AGENT_PERSONALITIES.findIndex(p => p.name === speaker.alias);
    const isWolf = speaker.role === ROLE_WEREWOLF;
    const othersAlive = alivePlayers.filter(p => p.address !== speaker.address);

    // Try Groq API first, fallback to hardcoded
    const aiResponse = await fetchAiResponse(
      personalityIndex >= 0 ? personalityIndex : 0,
      isWolf,
    );

    const line = aiResponse || getFallbackLine(speaker, othersAlive);

    dispatch({ type: "ADD_MESSAGE", payload: createPlayerMessage(speaker.address, speaker.alias, line, true) });
    aiChatIndexRef.current++;
  }, [state.players, state.phase, state.chatHistory, state, dispatch, fetchAiResponse, getFallbackLine]);

  // ─── AI votes (sequential) ────────────────────────────────
  const simulateAiVotes = useCallback(() => {
    const alivePlayers = state.players.filter(p => p.isAlive);
    const aiVoters = [...alivePlayers.filter(p => p.isAi)].sort(() => Math.random() - 0.5);

    aiVoters.forEach((aiPlayer, i) => {
      const t = setTimeout(() => {
        const isWolf = aiPlayer.role === ROLE_WEREWOLF;
        const targets = alivePlayers.filter(p => p.address !== aiPlayer.address);
        let target: Player;
        if (isWolf) {
          const nonWolves = targets.filter(p => p.role !== ROLE_WEREWOLF);
          target = nonWolves.length > 0 ? pickRandom(nonWolves) : pickRandom(targets);
        } else {
          target = pickRandom(targets);
        }
        dispatch({ type: "CAST_VOTE", payload: { voter: aiPlayer.address, target: target.address } });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage(`${aiPlayer.alias} voted to eliminate ${target.alias}.`) });
      }, (i + 1) * AI_VOTE_GAP);
      chatTimersRef.current.push(t);
    });
  }, [state.players, dispatch]);

  // ─── Eliminate and check win ─────────────────────────────────
  const eliminateAndCheck = useCallback((eliminatedAddr: string) => {
    const eliminated = state.players.find(p => p.address === eliminatedAddr);
    if (!eliminated) return;

    dispatch({ type: "ELIMINATE_PLAYER", payload: { address: eliminated.address, role: eliminated.role } });
    dispatch({
      type: "ADD_MESSAGE",
      payload: createSystemMessage(`The village has spoken. ${eliminated.alias} was voted out. They were a ${ROLE_NAMES[eliminated.role ?? 0]}.`),
    });

    // Check win conditions after 3s
    setTimeout(() => {
      const remaining = state.players.filter(p => p.isAlive && p.address !== eliminatedAddr);
      const wolves = remaining.filter(p => p.role === ROLE_WEREWOLF);
      const villagers = remaining.filter(p => p.role !== ROLE_WEREWOLF);

      if (wolves.length === 0) {
        dispatch({ type: "SET_WINNER", payload: "villagers" });
        dispatch({ type: "SET_PHASE", payload: { phase: PHASE_GAME_OVER, phaseEndTime: 0 } });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("The werewolf has been found! The village survives!") });
      } else if (wolves.length >= villagers.length) {
        dispatch({ type: "SET_WINNER", payload: "werewolves" });
        dispatch({ type: "SET_PHASE", payload: { phase: PHASE_GAME_OVER, phaseEndTime: 0 } });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("The werewolves have taken over the village! The pack wins!") });
      } else {
        dispatch({ type: "CLEAR_VOTES" });
        runoffCandidatesRef.current = [];
        dispatch({ type: "SET_ROUND", payload: state.round + 1 });
        dispatch({
          type: "SET_PHASE",
          payload: { phase: PHASE_NIGHT, phaseEndTime: Date.now() + NIGHT_TIME * 1000 },
        });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("The village voted wrong. Night falls. The werewolf is on the hunt...") });
      }
    }, 3000);
  }, [state.players, state.round, dispatch]);

  // ─── Tally votes → eliminate or trigger runoff ─────────────
  const tallyVotes = useCallback(() => {
    const voteCounts: Record<string, number> = {};
    Object.values(state.votes).forEach(target => {
      voteCounts[target] = (voteCounts[target] ?? 0) + 1;
    });

    if (Object.keys(voteCounts).length === 0) {
      dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("No votes were cast. The village couldn't decide.") });
      // Skip to night
      setTimeout(() => {
        dispatch({ type: "CLEAR_VOTES" });
        dispatch({ type: "SET_ROUND", payload: state.round + 1 });
        dispatch({ type: "SET_PHASE", payload: { phase: PHASE_NIGHT, phaseEndTime: Date.now() + NIGHT_TIME * 1000 } });
        dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("Night falls. The werewolf is on the hunt...") });
      }, 2000);
      return;
    }

    const maxVotes = Math.max(...Object.values(voteCounts));
    const topTargets = Object.entries(voteCounts).filter(([, v]) => v === maxVotes);

    if (topTargets.length === 1) {
      // Clear winner — eliminate them
      eliminateAndCheck(topTargets[0][0]);
    } else {
      // TIE — trigger runoff vote
      const tiedNames = topTargets.map(([addr]) => {
        const p = state.players.find(pl => pl.address === addr);
        return p?.alias ?? "Unknown";
      }).join(" and ");

      runoffCandidatesRef.current = topTargets.map(([addr]) => addr);

      dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage(`It's a tie! ${tiedNames} received ${maxVotes} votes each. RUNOFF VOTE — choose between them!`) });

      // Clear votes and start runoff
      setTimeout(() => {
        dispatch({ type: "CLEAR_VOTES" });
        dispatch({
          type: "SET_PHASE",
          payload: { phase: PHASE_DAY_VOTING, phaseEndTime: Date.now() + VOTING_TIME * 1000 },
        });

        // AI votes in runoff — only vote for the tied candidates
        const alivePlayers = state.players.filter(p => p.isAlive);
        const aiVoters = [...alivePlayers.filter(p => p.isAi)].sort(() => Math.random() - 0.5);
        const runoffAddrs = runoffCandidatesRef.current;

        aiVoters.forEach((aiPlayer, i) => {
          // Don't vote if the AI is one of the tied candidates
          if (runoffAddrs.includes(aiPlayer.address)) return;

          const t = setTimeout(() => {
            const isWolf = aiPlayer.role === ROLE_WEREWOLF;
            // Pick from runoff candidates only
            let targetAddr: string;
            if (isWolf) {
              // Wolf votes for non-wolf candidate if possible
              const nonWolfCandidate = runoffAddrs.find(addr => {
                const p = state.players.find(pl => pl.address === addr);
                return p && p.role !== ROLE_WEREWOLF;
              });
              targetAddr = nonWolfCandidate ?? pickRandom(runoffAddrs);
            } else {
              targetAddr = pickRandom(runoffAddrs);
            }

            const targetPlayer = state.players.find(p => p.address === targetAddr);
            dispatch({ type: "CAST_VOTE", payload: { voter: aiPlayer.address, target: targetAddr } });
            dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage(`${aiPlayer.alias} voted for ${targetPlayer?.alias ?? "Unknown"}.`) });
          }, (i + 1) * AI_VOTE_GAP);
          chatTimersRef.current.push(t);
        });
      }, 3000);
    }
  }, [state.votes, state.players, state.round, dispatch, eliminateAndCheck]);

  // ─── Handle runoff tally (reuse auto-tally effect) ─────────
  const tallyRunoff = useCallback(() => {
    const runoffAddrs = runoffCandidatesRef.current;
    if (runoffAddrs.length === 0) return;

    const voteCounts: Record<string, number> = {};
    Object.values(state.votes).forEach(target => {
      if (runoffAddrs.includes(target)) {
        voteCounts[target] = (voteCounts[target] ?? 0) + 1;
      }
    });

    if (Object.keys(voteCounts).length === 0) {
      // Still no votes — pick randomly
      eliminateAndCheck(pickRandom(runoffAddrs));
    } else {
      const maxVotes = Math.max(...Object.values(voteCounts));
      const top = Object.entries(voteCounts).filter(([, v]) => v === maxVotes);
      // If still tied, pick randomly between them
      eliminateAndCheck(pickRandom(top)[0]);
    }

    runoffCandidatesRef.current = [];
  }, [state.votes, eliminateAndCheck]);

  // ─── Move to voting ────────────────────────────────────────
  const moveToVoting = useCallback(() => {
    dispatch({
      type: "SET_PHASE",
      payload: { phase: PHASE_DAY_VOTING, phaseEndTime: Date.now() + VOTING_TIME * 1000 },
    });
    dispatch({ type: "CLEAR_VOTES" });
    dispatch({ type: "ADD_MESSAGE", payload: createSystemMessage("Discussion is over. Vote to eliminate who you think is the werewolf!") });
  }, [dispatch]);

  // ─── Auto-tally when all eligible voters have voted ─────────
  useEffect(() => {
    if (state.phase !== PHASE_DAY_VOTING) return;
    const isRunoff = runoffCandidatesRef.current.length > 0;
    // In a runoff, tied candidates don't vote
    const voters = isRunoff
      ? state.players.filter(p => p.isAlive && !runoffCandidatesRef.current.includes(p.address))
      : state.players.filter(p => p.isAlive);
    const voteCount = Object.keys(state.votes).length;

    if (voteCount > 0 && voteCount >= voters.length) {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      const t = setTimeout(() => {
        if (isRunoff) {
          tallyRunoff();
        } else {
          tallyVotes();
        }
      }, 2000);
      chatTimersRef.current.push(t);
    }
  }, [state.votes, state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Phase timer effect ────────────────────────────────────
  useEffect(() => {
    clearTimers();
    if (state.phase === PHASE_GAME_OVER || state.phase === PHASE_LOBBY) return;

    if (state.phase === PHASE_NIGHT) {
      nightResolvedRef.current = false;
      phaseTimerRef.current = setTimeout(() => autoNightResolve(), NIGHT_TIME * 1000);
    }

    if (state.phase === PHASE_DAY_DISCUSSION) {
      aiChatIndexRef.current = 0;
      const aiPlayers = state.players.filter(p => p.isAi && p.isAlive);
      const msgCount = Math.min(aiPlayers.length * 3, 12);
      let delay = 3000;
      for (let i = 0; i < msgCount; i++) {
        const d = delay;
        const t = setTimeout(() => simulateAiChat(), d);
        chatTimersRef.current.push(t);
        delay += AI_CHAT_GAP_MIN + Math.random() * (AI_CHAT_GAP_MAX - AI_CHAT_GAP_MIN);
      }
      phaseTimerRef.current = setTimeout(() => moveToVoting(), DISCUSSION_TIME * 1000);
    }

    if (state.phase === PHASE_DAY_VOTING) {
      const isRunoff = runoffCandidatesRef.current.length > 0;
      if (!isRunoff) {
        // Normal vote — AI votes then auto-tally
        const t = setTimeout(() => simulateAiVotes(), 3000);
        chatTimersRef.current.push(t);
      }
      // Auto-tally at timeout (runoff or normal)
      phaseTimerRef.current = setTimeout(() => {
        if (runoffCandidatesRef.current.length > 0) {
          tallyRunoff();
        } else {
          tallyVotes();
        }
      }, VOTING_TIME * 1000);
    }

    return clearTimers;
  }, [state.phase, state.round]); // eslint-disable-line react-hooks/exhaustive-deps

  return { startGame, moveToVoting, tallyVotes, wolfPickTarget, runoffCandidates: runoffCandidatesRef };
}
