import Groq from "groq-sdk";
import type { GameState, ChatMessage, Player, AgentPersonality } from "@/lib/ai-agents";
import { buildVotingPrompt, AGENT_PERSONALITIES } from "@/lib/ai-agents";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

interface VoteRequestBody {
  agentIndex: number;
  personalityIndex: number;
  gameState: GameState & { stakeAmount: string };
  chatHistory: ChatMessage[];
  alivePlayers: Player[];
  isWerewolf: boolean;
}

interface VoteResult {
  target: string;
  reasoning: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: VoteRequestBody = await request.json();
    const {
      personalityIndex,
      gameState,
      chatHistory,
      alivePlayers,
      isWerewolf,
    } = body;

    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    const personality: AgentPersonality =
      AGENT_PERSONALITIES[personalityIndex] ?? AGENT_PERSONALITIES[0];

    const reconstructedState: GameState = {
      ...gameState,
      stakeAmount: BigInt(gameState.stakeAmount ?? "0"),
    };

    const prompt = buildVotingPrompt(
      personality,
      reconstructedState,
      chatHistory,
      alivePlayers,
      isWerewolf
    );

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            'You are an AI voting in a Werewolf game. Respond ONLY with valid JSON in the format: {"target": "<address>", "reasoning": "<brief explanation>"}. No extra text.',
        },
        { role: "user", content: prompt },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    // Parse the JSON response
    let voteResult: VoteResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      voteResult = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: pick a random alive player if AI response is unparseable
      const validTargets = alivePlayers.filter(
        (p) => p.address !== body.gameState.players[body.agentIndex]?.address
      );
      const randomTarget =
        validTargets[Math.floor(Math.random() * validTargets.length)];
      voteResult = {
        target: randomTarget?.address ?? alivePlayers[0]?.address ?? "",
        reasoning: "I have my suspicions about this one.",
      };
    }

    // Validate the target is a valid alive player
    const isValidTarget = alivePlayers.some(
      (p) => p.address === voteResult.target
    );
    if (!isValidTarget && alivePlayers.length > 0) {
      voteResult.target = alivePlayers[0].address;
    }

    return Response.json(voteResult, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
