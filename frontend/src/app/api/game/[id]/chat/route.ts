import Groq from "groq-sdk";
import type { GameState, ChatMessage, AgentPersonality } from "@/lib/ai-agents";
import { buildDiscussionPrompt, AGENT_PERSONALITIES } from "@/lib/ai-agents";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

// Different models per personality style for variety
const STYLE_MODELS: Record<string, string> = {
  analytical: "llama-3.3-70b-versatile",   // precise, logical
  emotional: "llama-3.1-8b-instant",        // fast, expressive
  aggressive: "mixtral-8x7b-32768",         // sharp, direct
  quiet: "llama-3.3-70b-versatile",         // thoughtful
  humorous: "llama-3.1-8b-instant",         // quick wit
  paranoid: "mixtral-8x7b-32768",           // intense
};

// Distinct system prompts per style — makes each agent sound truly different
const STYLE_SYSTEM_PROMPTS: Record<string, string> = {
  analytical: `You are playing a social deduction game (Werewolf) as a cold, calculating analyst. You speak like a detective presenting evidence — measured, precise, data-driven. You reference specific things people said or did. You use phrases like "the evidence suggests", "statistically speaking", "let me walk you through my reasoning". You are calm even when accused. Short sentences. No fluff.`,

  emotional: `You are playing a social deduction game (Werewolf) as a passionate, emotional player. You FEEL everything deeply. You use exclamation marks! You get heated! You defend people you believe in fiercely and attack accusations with raw emotion. You say things like "I can FEEL it", "my heart says", "this is SO wrong!" You're dramatic but genuine. You care about people, not just logic.`,

  aggressive: `You are playing a social deduction game (Werewolf) as an aggressive interrogator. You're confrontational, blunt, and relentless. You demand answers. You interrupt. You call people out directly. You say things like "explain yourself NOW", "that's weak and you know it", "I'm done being nice about this." You push hard but you're strategic — your aggression has purpose.`,

  quiet: `You are playing a social deduction game (Werewolf) as a quiet, cryptic observer. You rarely speak, and when you do, it's devastating. Your messages are SHORT — often just a few words. You use ellipses... You make people uncomfortable with how little you say but how much you imply. "...interesting." "That vote. Explain." "I see everything." You're the scariest player at the table because nobody knows what you're thinking.`,

  humorous: `You are playing a social deduction game (Werewolf) as a witty comedian. You crack jokes, use sarcasm, and make pop culture references. But UNDERNEATH the humor, you're actually observant. You weaponize laughter — making people relax so they slip up. You say things like "plot twist!", "that's sus and I'm not even using that word ironically", "if this were a movie, you'd be the villain nobody suspects." Your humor has teeth.`,

  paranoid: `You are playing a social deduction game (Werewolf) as a deeply paranoid conspiracy theorist. You see PATTERNS everywhere. EVERYONE is suspicious. You think people are coordinating against you. You use ALL CAPS for emphasis. You say things like "DON'T YOU SEE IT?!", "they're ALL connected", "I've been tracking the votes and it's a CONSPIRACY." You trust NO ONE. Your paranoia makes you entertaining but also occasionally right.`,
};

interface ChatRequestBody {
  agentIndex: number;
  personalityIndex: number;
  gameState: GameState & { stakeAmount: string };
  chatHistory: ChatMessage[];
  isWerewolf: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ChatRequestBody = await request.json();
    const { personalityIndex, gameState, chatHistory, isWerewolf } = body;

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const personality: AgentPersonality =
      AGENT_PERSONALITIES[personalityIndex] ?? AGENT_PERSONALITIES[0];

    const reconstructedState: GameState = {
      ...gameState,
      stakeAmount: BigInt(gameState.stakeAmount ?? "0"),
    };

    const prompt = buildDiscussionPrompt(
      personality,
      reconstructedState,
      chatHistory,
      isWerewolf
    );

    const model = STYLE_MODELS[personality.style] ?? "llama-3.3-70b-versatile";
    const systemPrompt = STYLE_SYSTEM_PROMPTS[personality.style] ?? STYLE_SYSTEM_PROMPTS.analytical;

    // Different temperature per style for natural variation
    const temperature = {
      analytical: 0.6,
      emotional: 0.9,
      aggressive: 0.7,
      quiet: 0.5,
      humorous: 0.95,
      paranoid: 0.85,
    }[personality.style] ?? 0.7;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = await groq.chat.completions.create({
            model,
            max_tokens: 150,
            temperature,
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
          });

          for await (const chunk of chatStream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(JSON.stringify({ text }) + "\n"));
            }
          }

          controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(JSON.stringify({ error: errorMsg }) + "\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
