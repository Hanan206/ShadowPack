<p align="center">
  <img src="frontend/public/logo.png" alt="ShadowPack" width="120" />
</p>

<h1 align="center">ShadowPack</h1>

<p align="center">
  <strong>On-chain Werewolf with AI agents that think, deceive, and betray.</strong>
</p>

<p align="center">
  <a href="https://onescan.cc/testnet/object/0xdfbfc85c8bea16d1a4d9602ad758591402ca836835b018ed3cce49e5145c5eda">View Contract</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" /></a>
  <img src="https://img.shields.io/badge/OneChain-Testnet-E2B714" alt="OneChain" />
  <img src="https://img.shields.io/badge/Move-Smart_Contract-6E56CF" alt="Move" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" /></a>
</p>

<!-- TODO: Add screenshot -->

---

## What Is ShadowPack?

ShadowPack is a social deduction game (Werewolf) where you play alongside AI agents on OneChain. Six AI opponents with distinct personalities join the circle. They accuse, defend, deflect, and deceive in real time. The wolf hides among them. Find it before the village falls.

---

## The Problem

Werewolf needs 8+ people in the same room, at the same time, with the same energy level. That rarely happens. Online versions are either turn-based text games or require lobbies of strangers with zero accountability.

Blockchain gaming promises ownership and transparency, but most GameFi projects are DeFi with pixel art. No real gameplay.

## The Solution

ShadowPack puts LLM-powered AI agents into an on-chain Werewolf game. No need for 7 friends online. Connect your wallet, stake OCT, and match wits against six AI personalities, each running on a different model with unique behavior. The game is not scripted. The AI reacts to chat context, defends when accused, and wolves actively deceive the village.

---

## Features

- **Six AI personalities**: each powered by a different LLM (Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B) with unique conversational style
- **On-chain game creation**: games are Move shared objects on OneChain with OCT staking
- **Full game loop**: lobby, night kills, day discussion, voting, elimination, runoff tiebreakers
- **Role system**: Werewolf, Villager, Seer, Doctor with distinct night abilities
- **Spectator betting**: eliminated players bet on which side wins (Villagers vs Wolves)
- **Night phase interaction**: werewolf players select their prey from a target picker
- **Reactive AI conversations**: agents respond to accusations, agree/disagree with each other, wolves deflect blame
- **Broadcast-style UI**: chyron headers, live indicators, cinematic night overlays

---

## How to Play

1. **Connect wallet** and create a game (stakes OCT on-chain)
2. **Add AI agents** in the lobby. Pick from Marcus, Sofia, Viktor, Elise, Kai, or Nyx
3. **Hit GO LIVE** when you have 6+ players
4. A villager NPC is killed in the first night. The village wakes up.
5. **Day Discussion** (30s): AI agents chat, accuse each other. Use the Accuse/Defend buttons to participate.
6. **Day Voting**: everyone votes. The player with the most votes is eliminated. Ties trigger a runoff.
7. If the wolf was voted out, villagers win. Otherwise, night falls.
8. **Night Phase**: the wolf picks a prey to eliminate. If you are the wolf, you choose. If not, you wait.
9. Cycle repeats until one side wins.

**Win conditions:**
- All wolves eliminated = Villagers win
- Wolves equal or outnumber villagers = Wolves win

---

## AI Personalities

| Agent | Style | Model | Behavior |
|-------|-------|-------|----------|
| **Marcus** | Analytical | Llama 3.3 70B (temp 0.6) | Tracks patterns, references evidence, cold precision |
| **Sofia** | Emotional | Llama 3.1 8B (temp 0.9) | Gut instincts, passionate defenses, fierce loyalty |
| **Viktor** | Aggressive | Mixtral 8x7B (temp 0.7) | Demands answers, confrontational, zero tolerance |
| **Elise** | Observer | Llama 3.3 70B (temp 0.5) | Barely speaks. Short fragments. Devastating reads. |
| **Kai** | Trickster | Llama 3.1 8B (temp 0.95) | Jokes and sarcasm masking sharp deduction |
| **Nyx** | Paranoid | Mixtral 8x7B (temp 0.85) | Sees conspiracies everywhere. ALL CAPS emphasis. |

Wolf agents actively deceive: deflecting suspicion, scapegoating innocents, and subtly defending fellow wolves without being obvious.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | OneChain (Move-based L1) |
| Smart Contract | Move (legacy edition) |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, custom design system |
| AI Engine | Groq API (3 models per game) |
| Wallet | @onelabs/dapp-kit |
| State | React Context + Reducer (real-time game engine) |

---

## Smart Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| `shadowpack::game` | [`0xdfbf...5eda`](https://onescan.cc/testnet/object/0xdfbfc85c8bea16d1a4d9602ad758591402ca836835b018ed3cce49e5145c5eda) | Game rooms, role assignment, voting, betting, elimination |

**Entry functions:** `create_game`, `join_game`, `add_ai_player`, `start_game`, `cast_vote`, `eliminate_player`, `advance_phase`, `place_bet`, `settle_bets`

---

## How It Works

```
Browser (Next.js + React)
  |
  +---> OneChain RPC (game creation, voting, betting)
  |       |
  |       +---> GameRoom (shared object)
  |               ├── players, roles, votes
  |               ├── betting pool (Balance<OCT>)
  |               └── phase state machine
  |
  +---> Groq API (AI agent responses)
  |       ├── Llama 3.3 70B (Marcus, Elise)
  |       ├── Llama 3.1 8B (Sofia, Kai)
  |       └── Mixtral 8x7B (Viktor, Nyx)
  |
  +---> Game Engine (client-side)
          ├── Phase orchestration (night/day/vote)
          ├── AI chat scheduling
          ├── Vote tallying + runoff logic
          └── Win condition checks
```

---

## Running Locally

```bash
git clone https://github.com/ajanaku1/ShadowPack.git
cd ShadowPack/frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_PACKAGE_ID=0xdfbfc85c8bea16d1a4d9602ad758591402ca836835b018ed3cce49e5145c5eda
NEXT_PUBLIC_RPC_URL=https://rpc-testnet.onelabs.cc:443
GROQ_API_KEY=your_groq_api_key
```

Run the dev server:
```bash
npm run dev
```

Open `http://localhost:3000`.

### Deploy the contract (optional)

```bash
cd contract

# Install OneChain CLI
# Download from https://github.com/one-chain-labs/onechain/releases

one move build
one client publish --gas-budget 500000000 --skip-dependency-verification
```

Update `NEXT_PUBLIC_PACKAGE_ID` with the new PackageID.

---

## Testing the App

### Wallet setup

1. Install the OneChain wallet browser extension
2. Switch to OneChain Testnet
3. Get testnet OCT from the faucet: `one client faucet`
4. Open the app and connect your wallet

### Playing a game

1. Click "Enter the Pack" on the landing page
2. Click "Create Game", set stake amount (e.g. 1 OCT), max players (6-10), and your alias
3. Sign the transaction to create the game on-chain
4. In the lobby, click AI agents on the right panel to add them (need 5+ AI for 6 total)
5. Click "GO LIVE" to start
6. Play through the game loop: discussion, voting, night phase
7. If eliminated, use the betting panel to bet on which side wins

---

## Project Structure

```
ShadowPack/
├── contract/
│   ├── sources/
│   │   └── shadowpack.move          # Game logic: rooms, voting, betting, elimination
│   └── Move.toml                    # OneChain dependency config
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── game/page.tsx        # Game menu (create/join)
│   │   │   └── game/[id]/           # Dynamic game room page
│   │   ├── components/
│   │   │   ├── GameView.tsx         # Main game orchestrator
│   │   │   ├── GameLobby.tsx        # Pre-game lobby with ritual circle
│   │   │   ├── GameChat.tsx         # Chat with accuse/defend buttons
│   │   │   ├── VotingPanel.tsx      # Vote UI with runoff support
│   │   │   ├── BettingPanel.tsx     # Villagers vs Wolves side bets
│   │   │   ├── GameResult.tsx       # End screen with role reveals
│   │   │   ├── PlayerList.tsx       # Player sidebar
│   │   │   └── PhaseTimer.tsx       # Countdown timer
│   │   ├── hooks/
│   │   │   └── useGameEngine.ts     # AI orchestration + game loop
│   │   └── lib/
│   │       ├── ai-agents.ts         # Personality definitions + prompts
│   │       ├── contracts.ts         # Move transaction builders
│   │       ├── game-store.ts        # State management (Context + Reducer)
│   │       └── constants.ts         # Game config, role definitions
│   └── public/
│       └── logo.png                 # ShadowPack wolf logo
├── README.md
└── LICENSE
```

---

## Roadmap

### Phase 1: Foundation (Current)
- [x] Move smart contract deployed on OneChain testnet
- [x] Full game loop with all phases
- [x] 6 AI personalities with LLM-powered conversations (3 different models)
- [x] Spectator betting (villagers vs wolves)
- [x] Runoff voting for ties
- [x] Role-based night actions
- [x] Broadcast-style responsive UI

### Phase 2: Multiplayer and Economy
- [ ] WebSocket real-time multiplayer with multiple human players
- [ ] Fully on-chain game state verification
- [ ] OCT prize pool auto-distribution via smart contract
- [ ] Spectator mode for watching live games
- [ ] On-chain bet settlement

### Phase 3: NFTs and Identity
- [ ] Player NFT profiles with win/loss records
- [ ] Collectible AI personality skins
- [ ] Tournament system with bracket competitions
- [ ] Seasonal leaderboard with OCT rewards

### Phase 4: Advanced AI and Governance
- [ ] Fine-tuned Werewolf-specific AI models
- [ ] Adjustable AI difficulty levels
- [ ] DAO governance for game rules and features
- [ ] Community-created custom roles

### Phase 5: Platform
- [ ] Custom game mode marketplace
- [ ] AI agent NFT trading
- [ ] Native mobile app (iOS/Android)
- [ ] SDK for building social deduction games on the ShadowPack protocol

---

## Built For

**OneHack 3.0: AI and GameFi Edition** | Built on OneChain's Move-based infrastructure

---

## License

[MIT](LICENSE)
