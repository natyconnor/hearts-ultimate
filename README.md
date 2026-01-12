# ♥️ Hearts Ultimate

A modern, real-time multiplayer implementation of the classic Hearts card game built with React, TypeScript, and Supabase.

![Hearts](https://img.shields.io/badge/Game-Hearts-red?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?style=for-the-badge&logo=supabase)

## ✨ Features

### 🎮 Core Gameplay
- **Full Hearts Rules** — Complete implementation including passing phases (left, right, across, hold), hearts broken mechanic, and shooting the moon
- **Real-time Multiplayer** — Play with friends via shareable room codes with instant synchronization
- **Smart AI Opponents** — Three difficulty levels with distinct playing styles
- **Spectator Mode** — Watch ongoing games without participating

### 🤖 AI System

The game features a sophisticated AI system with three difficulty levels:

| Level | Description |
|-------|-------------|
| 🌱 **Easy** | Plays basic cards, suitable for learning the game |
| ⚡ **Medium** | Strategic play that actively avoids penalty cards |
| 🧠 **Hard** | Expert AI with card memory, moon detection, and adaptive aggressiveness |

#### Hard AI Features
- **Card Memory** — Tracks played cards and remembers which players are void in suits
- **Moon Detection** — Identifies and responds to moon shooting attempts (both offensive and defensive)
- **Adaptive Personality** — Each AI has a unique aggressiveness level that adjusts based on score position
- **Strategic Passing** — Analyzes hand composition for optimal card passing
- **Leader Targeting** — Focuses pressure on players in the lead

### 🎨 User Experience
- **Smooth Animations** — Polished card animations and transitions using Framer Motion
- **Responsive Design** — Works on desktop and mobile devices
- **Game Statistics** — Track your wins, games played, and moon shots
- **Sound Effects** — Optional audio feedback for card plays and game events
- **Disconnect Handling** — Grace period for reconnecting during games

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recommended) or npm
- [Supabase](https://supabase.com/) account (for multiplayer)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hearts-ultimate.git
   cd hearts-ultimate
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**

   Run the migrations in your Supabase project:
   ```bash
   supabase db push
   ```

   Or manually run the SQL files in `supabase/migrations/`

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open the game**

   Navigate to `http://localhost:5173` in your browser

## 🎯 How to Play

### Creating a Game
1. Click **Create Game** on the home page
2. Share the room code with friends, or add AI players
3. Once 4 players have joined, click **Start Game**

### Gameplay
1. **Passing Phase** — Select 3 cards to pass to another player (direction rotates each round)
2. **Playing Phase** — The player with 2♣ leads the first trick
3. **Follow Suit** — You must follow the lead suit if possible
4. **Hearts** — Cannot lead hearts until they've been "broken" (played when unable to follow suit)
5. **Scoring** — Hearts = 1 point each, Queen of Spades = 13 points
6. **Winning** — Lowest score wins when someone reaches 100 points

### Special Rules
- **Shooting the Moon** — Collect all 26 penalty points to give everyone else 26 points instead
- **First Trick** — No penalty cards (hearts or Q♠) can be played on the first trick

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.9 |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion |
| **State Management** | Zustand, TanStack Query |
| **Backend** | Supabase (PostgreSQL + Realtime) |
| **Testing** | Vitest, Testing Library |
| **Routing** | React Router 7 |

## 📁 Project Structure

```
src/
├── components/        # React components
│   ├── Card.tsx          # Individual card display
│   ├── CardHand.tsx      # Player's hand
│   ├── GameTable.tsx     # Main game board
│   ├── GameLobby.tsx     # Pre-game lobby
│   └── ...
├── game/             # Game logic
│   ├── rules.ts          # Hearts rules validation
│   ├── gameLogic.ts      # Game state management
│   ├── deck.ts           # Card deck operations
│   └── passingLogic.ts   # Passing phase logic
├── lib/              # Utilities and AI
│   ├── ai/               # AI system
│   │   ├── strategies/   # Difficulty implementations
│   │   │   ├── easy.ts
│   │   │   ├── medium.ts
│   │   │   └── hard/     # Advanced Hard AI
│   │   ├── memory/       # Card tracking
│   │   └── utils/        # AI helpers
│   ├── roomApi.ts        # Supabase room operations
│   └── sounds.ts         # Audio effects
├── hooks/            # React hooks
│   ├── useGameRealtime.ts
│   ├── usePlayerPresence.ts
│   └── ...
├── pages/            # Route pages
│   ├── Home.tsx
│   └── GameRoom.tsx
├── store/            # Zustand stores
├── types/            # TypeScript types
└── contexts/         # React contexts
```

## 🧪 Testing

Run the test suite:

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests in watch mode
pnpm test -- --watch
```

The project includes comprehensive tests for:
- Game rules and validation
- AI decision making
- Component rendering
- Edge cases and special scenarios

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 Game Rules Reference

<details>
<summary><b>Click to expand full rules</b></summary>

### Objective
Have the **lowest score** when any player reaches 100 points.

### Card Values
- Each **Heart** ♥️ = 1 point
- **Queen of Spades** ♠️ = 13 points
- All other cards = 0 points

### Passing
- **Round 1**: Pass 3 cards to your **left**
- **Round 2**: Pass 3 cards to your **right**
- **Round 3**: Pass 3 cards **across**
- **Round 4**: No passing (hold)
- *Pattern repeats*

### Gameplay
1. Player with **2♣** leads the first trick
2. Players must **follow suit** if possible
3. If you can't follow suit, you may play any card
4. Highest card of the **lead suit** wins the trick
5. Trick winner leads the next trick

### Breaking Hearts
- Hearts cannot be led until:
  - A heart has been discarded on a previous trick, OR
  - You have only hearts in your hand

### Shooting the Moon
- If one player takes **all 26 penalty points** in a round:
  - That player scores **0 points**
  - All other players receive **26 points**

</details>

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ♥️ by hearts enthusiast Nathan Connor
</p>
