# ♥️ Hearts Ultimate

A real-time multiplayer Hearts card game with smart AI opponents.

## ✨ Features

- **Real-time Multiplayer** — Play with friends via shareable room codes
- **Smart AI Opponents** — 3 difficulty levels, from beginner-friendly to expert
- **Spectator Mode** — Watch ongoing games
- **Shooting the Moon** — Full rules including the classic high-risk strategy
- **Disconnect Handling** — Grace period for reconnecting mid-game

## 🧠 Hard AI

The Hard AI plays like an experienced human with these advanced behaviors:

| Feature | Description |
|---------|-------------|
| **Card Memory** | Tracks played cards and remembers who's void in each suit |
| **Moon Detection** | Identifies opponents attempting to shoot the moon via behavioral signals (Q♠ leads, voluntary penalty wins) |
| **Moon Shooting** | Evaluates its own hand for moon potential—prioritizes A♥, Q♠ control, and high-card density |
| **Dynamic Personality** | Each AI gets a random aggressiveness level (conservative ↔ aggressive) |
| **Adaptive Play** | Losing AIs take more risks; winning AIs play safe |
| **Leader Targeting** | Aggressive AIs hold penalty cards to dump on the player in first place |

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **Backend** | [Convex](https://convex.dev) (reactive database + auth) |
| **State** | Zustand |
| **Hosting** | Vercel |

## 🚀 Getting Started

```bash
pnpm install
npx convex dev --once --configure=new
pnpm dev:all
```

Add `VITE_CONVEX_URL` to `.env.local` from your Convex dashboard.

Made with ❤️ by Hearts enthusiast Nathan Connor

### 📄 License
MIT
