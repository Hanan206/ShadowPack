"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useGame } from "@/lib/game-store";
import { AGENT_PERSONALITIES } from "@/lib/ai-agents";
import type { ChatMessage } from "@/lib/ai-agents";
import { PHASE_DAY_DISCUSSION } from "@/lib/constants";

interface GameChatProps {
  currentPlayerAddress: string;
  currentPlayerAlias: string;
  isTyping?: boolean;
  typingAgentName?: string;
  onSendMessage?: (content: string) => void;
  isPlayerAlive?: boolean;
}

function getAgentColor(senderAlias: string): string {
  const agent = AGENT_PERSONALITIES.find((a) => a.name === senderAlias);
  return agent?.color ?? "#94a3b8";
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Auto-generated accusation lines for human players
const ACCUSATION_TEMPLATES = [
  "I'm calling it — @{target} is acting way too suspicious. We need to vote them out.",
  "Something about @{target} doesn't sit right with me. They've been dodging questions all game.",
  "Has anyone else noticed how @{target} keeps deflecting? That's classic wolf behavior.",
  "I've been watching @{target} closely and I don't trust them one bit. They need to go.",
  "My gut tells me @{target} is hiding something. I say we put them to the test.",
  "@{target}, you've been real quiet when it matters. That tells me everything I need to know.",
  "Look at @{target}'s voting pattern — it doesn't add up. I'm suspicious.",
  "I think @{target} is playing us all. Time to call them out.",
];

const DEFENSE_TEMPLATES = [
  "I'm innocent! Focus on who's actually been acting suspicious instead of scapegoating me.",
  "You're all barking up the wrong tree. The real wolf is laughing while you waste time on me.",
  "If I were a wolf, would I really be drawing this much attention to myself? Think about it.",
  "I've been helping the village this whole time. Look at my votes — they speak for themselves.",
];

function MessageRow({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  if (message.isSystem) {
    return (
      <div className="px-4 py-2" style={{ animation: "slideUp 0.2s ease-out" }}>
        <div
          className="rounded-r-lg px-4 py-2.5"
          style={{
            background: "rgba(255,70,85,0.08)",
            borderLeft: "3px solid var(--red)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="live-dot flex-shrink-0" style={{ width: 5, height: 5 }} />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--red)" }}>
                BREAKING
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const agentColor = message.isAi ? getAgentColor(message.senderAlias) : undefined;
  const nameColor = agentColor ?? (isOwnMessage ? "var(--gold)" : "var(--text)");

  // Render @mentions with color
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w[\w\s]*?)(?=\s|$|,|\.|\!|\?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionName = part.slice(1);
        const mentionAgent = AGENT_PERSONALITIES.find(a => mentionName.startsWith(a.name));
        return (
          <span key={i} className="font-bold" style={{ color: mentionAgent?.color ?? "var(--gold)" }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex gap-2.5 px-5 py-1.5 hover:bg-white/[0.02] transition-colors" style={{ animation: "slideUp 0.2s ease-out" }}>
      <div
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
        style={{
          background: "var(--elevated)",
          border: `1.5px solid ${agentColor ?? (isOwnMessage ? "var(--gold)" : "rgba(122,116,144,0.2)")}`,
          color: nameColor,
        }}
      >
        {message.senderAlias.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold" style={{ color: nameColor }}>
            {message.senderAlias}
          </span>
          {message.isAi && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(110,86,207,0.12)", color: "var(--purple)" }}>AI</span>
          )}
          {isOwnMessage && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(226,183,20,0.12)", color: "var(--gold)" }}>You</span>
          )}
          <span className="text-[10px] ml-auto" style={{ color: "var(--muted-color)" }}>
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {renderContent(message.content)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator({ agentName }: { agentName?: string }) {
  const agentColor = agentName ? getAgentColor(agentName) : "#94a3b8";
  return (
    <div className="px-5 py-2.5 flex items-center gap-2" style={{ borderTop: "1px solid rgba(122,116,144,0.06)" }}>
      <span className="text-xs italic" style={{ color: "var(--muted-color)" }}>
        {agentName && <span style={{ color: agentColor, fontWeight: 700, fontStyle: "normal" }}>{agentName}</span>}{" "}is typing
      </span>
      <div className="flex gap-[3px]">
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--muted-color)", animation: "typingBounce 1.2s ease-in-out infinite" }} />
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--muted-color)", animation: "typingBounce 1.2s ease-in-out 0.15s infinite" }} />
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--muted-color)", animation: "typingBounce 1.2s ease-in-out 0.3s infinite" }} />
      </div>
    </div>
  );
}

export default function GameChat({
  currentPlayerAddress,
  currentPlayerAlias,
  isTyping = false,
  typingAgentName,
  onSendMessage,
  isPlayerAlive = true,
}: GameChatProps) {
  const { state } = useGame();
  const [showAccuseMenu, setShowAccuseMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isDiscussionPhase = state.phase === PHASE_DAY_DISCUSSION;
  const messageCount = state.chatHistory.filter((m) => !m.isSystem).length;
  const canChat = isDiscussionPhase && isPlayerAlive;

  const alivePlayers = state.players.filter(
    (p) => p.isAlive && p.address !== currentPlayerAddress
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory.length, isTyping, scrollToBottom]);

  function handleAccuse(targetAlias: string) {
    if (!onSendMessage) return;
    const template = ACCUSATION_TEMPLATES[Math.floor(Math.random() * ACCUSATION_TEMPLATES.length)];
    const message = template.replace("{target}", targetAlias);
    onSendMessage(message);
    setShowAccuseMenu(false);
  }

  function handleDefend() {
    if (!onSendMessage) return;
    const message = DEFENSE_TEMPLATES[Math.floor(Math.random() * DEFENSE_TEMPLATES.length)];
    onSendMessage(message);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--void)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(122,116,144,0.08)", background: "rgba(22,21,37,0.6)" }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-xs font-bold uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-color)", fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            Comms Feed
          </h2>
          <span className="text-xs" style={{ color: "var(--muted-color)" }}>{messageCount} messages</span>
        </div>
        {isDiscussionPhase && (
          <span className="live-label">
            <span className="live-dot" style={{ width: 6, height: 6 }} /> Live
          </span>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-3 space-y-0.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#201F32 transparent" }}
      >
        {state.chatHistory.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm" style={{ color: "var(--muted-color)" }}>No messages yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-color)", opacity: 0.6 }}>
                Messages will appear here during discussion
              </p>
            </div>
          </div>
        )}

        {state.chatHistory.map((msg) => (
          <MessageRow
            key={msg.id}
            message={msg}
            isOwnMessage={msg.sender === currentPlayerAddress}
          />
        ))}

        {isTyping && <TypingIndicator agentName={typingAgentName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Action bar — accusation picker instead of text input */}
      <div
        className="px-4 py-3 relative"
        style={{ borderTop: "1px solid rgba(122,116,144,0.08)", background: "var(--surface)" }}
      >
        {!canChat ? (
          <div className="text-center py-2">
            <p className="text-xs" style={{ color: "var(--muted-color)" }}>
              {!isPlayerAlive ? "You have been eliminated. Spectating..." : "Chat available during discussion phase"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Accuse button */}
            <button
              onClick={() => setShowAccuseMenu(!showAccuseMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: showAccuseMenu ? "rgba(255,70,85,0.15)" : "var(--elevated)",
                border: `1px solid ${showAccuseMenu ? "var(--red)" : "rgba(122,116,144,0.1)"}`,
                color: showAccuseMenu ? "var(--red)" : "var(--text)",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
              </svg>
              Accuse
            </button>

            {/* Defend button */}
            <button
              onClick={handleDefend}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: "var(--elevated)",
                border: "1px solid rgba(122,116,144,0.1)",
                color: "var(--green)",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              Defend
            </button>

            <span className="text-xs ml-auto" style={{ color: "var(--muted-color)" }}>
              Pick a player to accuse
            </span>
          </div>
        )}

        {/* Accusation target picker dropdown */}
        {showAccuseMenu && canChat && (
          <div
            className="absolute bottom-full left-4 right-4 mb-2 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid rgba(122,116,144,0.15)", zIndex: 50 }}
          >
            <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(122,116,144,0.08)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--red)" }}>
                Who do you suspect?
              </p>
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {alivePlayers.map((player) => {
                const agentColor = player.isAi ? getAgentColor(player.alias) : "#94a3b8";
                return (
                  <button
                    key={player.address}
                    onClick={() => handleAccuse(player.alias)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/[0.04]"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: `${agentColor}15`, color: agentColor, border: `1px solid ${agentColor}30` }}
                    >
                      {player.alias.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{player.alias}</span>
                    {player.isAi && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(110,86,207,0.12)", color: "var(--purple)" }}>AI</span>
                    )}
                    <span className="text-[10px] ml-auto" style={{ color: "var(--red)" }}>Accuse</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
