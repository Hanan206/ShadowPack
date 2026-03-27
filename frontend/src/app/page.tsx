"use client";

import { useEffect, useRef } from "react";

/* ─── Agent Data ───────────────────────────────────────────── */
const AGENTS = [
  {
    name: "Marcus",
    color: "#94a3b8",
    trait: "Analyst",
    catchphrase: "The numbers don't lie. People do.",
    stats: { deduction: 92, aggression: 35, deception: 20 },
    icon: "detective",
  },
  {
    name: "Sofia",
    color: "#c084fc",
    trait: "Empath",
    catchphrase: "I can feel the deception in this room.",
    stats: { deduction: 78, aggression: 25, deception: 65 },
    icon: "crystal-ball",
  },
  {
    name: "Viktor",
    color: "#f87171",
    trait: "Enforcer",
    catchphrase: "Explain yourself. Now.",
    stats: { deduction: 50, aggression: 95, deception: 40 },
    icon: "skull",
  },
  {
    name: "Elise",
    color: "#a78bfa",
    trait: "Observer",
    catchphrase: "...interesting.",
    stats: { deduction: 60, aggression: 30, deception: 90 },
    icon: "hood",
  },
  {
    name: "Kai",
    color: "#fbbf24",
    trait: "Trickster",
    catchphrase: "Was that a joke or a confession?",
    stats: { deduction: 45, aggression: 70, deception: 85 },
    icon: "raven",
  },
  {
    name: "Nyx",
    color: "#fb923c",
    trait: "Conspiracist",
    catchphrase: "They're ALL in on it.",
    stats: { deduction: 88, aggression: 55, deception: 30 },
    icon: "eye",
  },
] as const;

/* ─── SVG Icon Components ──────────────────────────────────── */
function AgentIcon({ type, color }: { type: string; color: string }) {
  const size = 48;
  switch (type) {
    case "detective":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M24 6C17 6 12 11 12 18c0 4 2 7.5 5 10l-1 4h16l-1-4c3-2.5 5-6 5-10 0-7-5-12-12-12z"
            fill={color}
            opacity="0.15"
          />
          <path
            d="M24 8c-5.5 0-10 4.5-10 10 0 3.5 1.8 6.5 4.5 8.3l.5.3-.8 3.4h11.6l-.8-3.4.5-.3C32.2 24.5 34 21.5 34 18c0-5.5-4.5-10-10-10z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="20" cy="18" r="2" fill={color} />
          <circle cx="28" cy="18" r="2" fill={color} />
          <path d="M10 16h28" stroke={color} strokeWidth="2" opacity="0.4" />
          <path
            d="M18 40h12M20 36h8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "crystal-ball":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="22" r="14" fill={color} opacity="0.1" />
          <circle
            cx="24"
            cy="22"
            r="14"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M18 19c1-3 3.5-5 6-5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <ellipse
            cx="24"
            cy="40"
            rx="10"
            ry="3"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path d="M18 36h12v2c0 1-2.5 3-6 3s-6-2-6-3v-2z" fill={color} opacity="0.15" />
        </svg>
      );
    case "skull":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M24 6C16 6 10 12 10 20c0 5 2.5 9 6 11v5h16v-5c3.5-2 6-6 6-11 0-8-6-14-14-14z"
            fill={color}
            opacity="0.12"
          />
          <path
            d="M24 8c-6.6 0-12 5.4-12 12 0 4.4 2.4 8.3 6 10.4V36h12v-5.6c3.6-2.1 6-6 6-10.4 0-6.6-5.4-12-12-12z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="19" cy="20" r="3" fill={color} />
          <circle cx="29" cy="20" r="3" fill={color} />
          <path d="M21 30v6M24 30v6M27 30v6" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case "hood":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M24 4C15 4 8 12 8 22v14c0 2 1 4 3 5h26c2-1 3-3 3-5V22c0-10-7-18-16-18z"
            fill={color}
            opacity="0.1"
          />
          <path
            d="M24 6c-8 0-14 7-14 16v12c0 2 1.5 4 4 4h20c2.5 0 4-2 4-4V22c0-9-6-16-14-16z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M16 24c0 0 3-2 8-2s8 2 8 2"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            opacity="0.5"
          />
          <circle cx="20" cy="26" r="1.5" fill={color} />
          <circle cx="28" cy="26" r="1.5" fill={color} />
        </svg>
      );
    case "raven":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M14 34c-2 2-4 6-4 8h28c0-2-2-6-4-8"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M24 6c-8 0-12 6-12 14 0 6 3 10 8 14h8c5-4 8-8 8-14 0-8-4-14-12-14z"
            fill={color}
            opacity="0.12"
          />
          <path
            d="M24 8c-7 0-10 5-10 12 0 5 2.5 9 7 12.5h6c4.5-3.5 7-7.5 7-12.5 0-7-3-12-10-12z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="20" cy="18" r="2" fill={color} />
          <circle cx="28" cy="18" r="2" fill={color} />
          <path d="M22 24l2 4 2-4" stroke={color} strokeWidth="1.5" fill="none" />
        </svg>
      );
    case "eye":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            d="M6 24s7-12 18-12 18 12 18 12-7 12-18 12S6 24 6 24z"
            fill={color}
            opacity="0.1"
          />
          <path
            d="M6 24s7-12 18-12 18 12 18 12-7 12-18 12S6 24 6 24z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="24" cy="24" r="7" stroke={color} strokeWidth="2" fill="none" />
          <circle cx="24" cy="24" r="3" fill={color} />
          <path
            d="M24 6v4M24 38v4M40 24h4M0 24h4"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>
      );
    default:
      return null;
  }
}

/* ─── Wolf Head Logo SVG ───────────────────────────────────── */
function WolfLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="ShadowPack" width={32} height={32} style={{ objectFit: "contain" }} />
  );
}

/* ─── Stat Bar Component ───────────────────────────────────── */
function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider w-[72px]" style={{ color: "#7A7490" }}>
        {label}
      </span>
      <div className="flex-1 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ─── Feature Card Icons ───────────────────────────────────── */
function FeatureIcon({ type }: { type: string }) {
  const gold = "#E2B714";
  switch (type) {
    case "agents":
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="14" r="6" stroke={gold} strokeWidth="2" fill="none" />
          <path d="M8 34c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke={gold} strokeWidth="2" fill="none" />
          <circle cx="32" cy="12" r="4" stroke={gold} strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="8" cy="12" r="4" stroke={gold} strokeWidth="1.5" fill="none" opacity="0.5" />
        </svg>
      );
    case "chain":
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="8" width="12" height="10" rx="3" stroke={gold} strokeWidth="2" fill="none" />
          <rect x="24" y="22" width="12" height="10" rx="3" stroke={gold} strokeWidth="2" fill="none" />
          <path d="M16 13h8M16 27h8" stroke={gold} strokeWidth="2" />
          <rect x="14" y="15" width="12" height="10" rx="3" stroke={gold} strokeWidth="2" fill="none" />
        </svg>
      );
    case "betting":
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke={gold} strokeWidth="2" fill="none" />
          <path d="M20 10v20M14 16h12M14 24h12" stroke={gold} strokeWidth="2" />
          <circle cx="20" cy="20" r="5" stroke={gold} strokeWidth="1.5" fill="none" opacity="0.4" />
        </svg>
      );
    case "social":
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M6 30V14l14-8 14 8v16l-14 8-14-8z" stroke={gold} strokeWidth="2" fill="none" />
          <circle cx="20" cy="20" r="5" stroke={gold} strokeWidth="2" fill="none" />
          <path d="M20 6v9M20 25v9M6 14l9 4M25 22l9 4M34 14l-9 4M15 22l-9 4" stroke={gold} strokeWidth="1" opacity="0.3" />
        </svg>
      );
    default:
      return null;
  }
}

/* ─── Stars Background ─────────────────────────────────────── */
function Stars() {
  const stars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.round((i * 47 + 13) % 100)}%`,
    top: `${Math.round((i * 31 + 7) % 60)}%`,
    size: i % 3 === 0 ? 3 : 2,
    delay: `${(i * 0.7) % 5}s`,
    duration: `${2 + (i % 3)}s`,
  }));

  return (
    <>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            background: "rgba(255,255,255,0.6)",
            animation: `twinkle ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}
    </>
  );
}

/* ─── Feature Data ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "agents",
    title: "AI Agents",
    desc: "Six unique AI personalities with distinct strategies, personalities, and deception styles. Each game is unpredictable.",
  },
  {
    icon: "chain",
    title: "On-Chain Votes",
    desc: "Every vote, accusation, and elimination is recorded on OneChain. Full transparency, zero manipulation.",
  },
  {
    icon: "betting",
    title: "Spectator Betting",
    desc: "Wager OCT on who you think the wolves are. Predict correctly and earn rewards from the prize pool.",
  },
  {
    icon: "social",
    title: "Social Deduction",
    desc: "Watch AI agents debate, deceive, and deduce in real-time. Spot the wolves before the village falls.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const launchGame = () => {
    window.open("/game", "_blank");
  };

  return (
    <div className="relative min-h-screen" style={{ background: "var(--void)" }}>
      {/* ─── FIXED TOPBAR ──────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(11,10,20,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226,183,20,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <WolfLogo />
          <span
            className="text-sm font-bold uppercase tracking-[3px]"
            style={{ color: "#fff" }}
          >
            ShadowPack
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--red)" }}
          >
            Live
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={scrollToFeatures}
            className="text-sm transition-colors cursor-pointer"
            style={{ color: "var(--muted-color)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--muted-color)")
            }
          >
            How It Works
          </button>
          <button className="btn-gold text-xs !py-2 !px-5 cursor-pointer" onClick={launchGame}>
            Play Now
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION ──────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          minHeight: "100vh",
          paddingTop: "72px",
          background: `
            radial-gradient(ellipse 60% 50% at 15% 50%, rgba(110,86,207,0.15) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 40%, rgba(226,183,20,0.1) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 50% 90%, rgba(59,155,109,0.08) 0%, transparent 70%),
            var(--void)
          `,
        }}
      >
        <Stars />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content — 45% */}
          <div className="lg:w-[45%] flex flex-col gap-6" style={{ animation: "slideUp 0.6s ease-out" }}>
            <h1 className="crimson text-5xl lg:text-[56px] leading-tight">
              <span style={{ color: "#fff" }}>Shadow</span>
              <span style={{ color: "var(--gold)" }}>Pack</span>
            </h1>

            <p className="text-xl font-medium" style={{ color: "var(--muted-color)" }}>
              Social deception, on-chain. Play with AI agents that think, deceive, and betray.
            </p>

            <p className="text-[15px] leading-relaxed max-w-md" style={{ color: "var(--muted-color)" }}>
              Enter the ritual circle where human cunning meets artificial
              intelligence. ShadowPack is a fully on-chain Werewolf game where
              AI agents with distinct personalities join the hunt. Stake, deceive, survive.
            </p>

            <div className="flex flex-wrap gap-3 mt-2">
              <button className="btn-gold cursor-pointer" onClick={launchGame}>
                Enter the Pack
              </button>
              <button className="btn-outline cursor-pointer" onClick={scrollToFeatures}>
                Watch Live
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {["1,247 Games", "89.2 OCT Staked", "6 AI Agents"].map(
                (stat) => (
                  <span
                    key={stat}
                    className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "var(--muted-color)",
                    }}
                  >
                    {stat}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right Content — 55% Agent Grid */}
          <div className="lg:w-[55%] grid grid-cols-2 sm:grid-cols-3 gap-4">
            {AGENTS.map((agent, i) => (
              <div
                key={agent.name}
                className="card-game p-5 flex flex-col gap-3 cursor-default"
                style={{
                  borderColor: `${agent.color}15`,
                  animation: `idleFloat 3.5s ease-in-out ${i * 0.3}s infinite, slideUp 0.5s ease-out ${i * 0.08}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${agent.color}40`;
                  e.currentTarget.style.boxShadow = `0 0 24px ${agent.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${agent.color}15`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <AgentIcon type={agent.icon} color={agent.color} />
                <div>
                  <h3 className="text-base font-bold" style={{ color: "#fff" }}>
                    {agent.name}
                  </h3>
                  <p
                    className="text-xs italic mt-0.5"
                    style={{ color: "var(--muted-color)" }}
                  >
                    &ldquo;{agent.catchphrase}&rdquo;
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full self-start"
                  style={{
                    background: `${agent.color}18`,
                    color: agent.color,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  {agent.trait}
                </span>
                <div className="flex flex-col gap-1.5 mt-1">
                  <StatBar
                    label="Deduction"
                    value={agent.stats.deduction}
                    color={agent.color}
                  />
                  <StatBar
                    label="Aggression"
                    value={agent.stats.aggression}
                    color={agent.color}
                  />
                  <StatBar
                    label="Deception"
                    value={agent.stats.deception}
                    color={agent.color}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ──────────────────────────────── */}
      <section
        ref={featuresRef}
        className="relative py-24 px-6 lg:px-12"
        style={{ background: "var(--void)" }}
      >
        <div className="max-w-[1440px] mx-auto">
          <h2
            className="crimson text-4xl lg:text-5xl text-center mb-4"
            style={{ color: "#fff" }}
          >
            How It Works
          </h2>
          <p
            className="text-center text-base mb-16 max-w-lg mx-auto"
            style={{ color: "var(--muted-color)" }}
          >
            A social deduction game where AI agents and blockchain meet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className="card-game p-6 flex flex-col items-start gap-4"
                style={{
                  animation: `slideUp 0.5s ease-out ${i * 0.1}s both`,
                }}
              >
                <FeatureIcon type={feat.icon} />
                <h3 className="text-lg font-bold" style={{ color: "#fff" }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-color)" }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ───────────────────────────────────── */}
      <section
        className="relative py-24 px-6 lg:px-12 text-center"
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 50% 50%, rgba(226,183,20,0.06) 0%, transparent 70%),
            var(--void)
          `,
        }}
      >
        <div className="max-w-[1440px] mx-auto flex flex-col items-center gap-6">
          <h2 className="crimson text-4xl lg:text-5xl" style={{ color: "var(--gold)" }}>
            Ready to Hunt?
          </h2>
          <p className="text-lg max-w-md" style={{ color: "var(--muted-color)" }}>
            Enter the ritual. Trust no one.
          </p>
          <button className="btn-gold text-base !py-4 !px-10 mt-4 cursor-pointer" onClick={launchGame}>
            Launch Game
          </button>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer
        className="py-8 text-center text-sm"
        style={{
          color: "var(--muted-color)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        ShadowPack &copy; 2026 &bull; Built on OneChain
      </footer>
    </div>
  );
}
