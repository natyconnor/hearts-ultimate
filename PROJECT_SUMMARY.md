# Hearts Ultimate - Project Summary

## Overview
Multiplayer Hearts card game: React 19 + TypeScript, Vite, Zustand, TanStack Query, React Router v7, Supabase (PostgreSQL + Realtime), Tailwind CSS v4, Framer Motion. Real-time multiplayer with room-based matchmaking, poker table UI, card animations.

## Project Structure
```
src/
├── App.tsx, main.tsx, supabaseClient.ts, index.css
├── pages/Home.tsx, GameRoom.tsx
├── components/Card.tsx, CardHand.tsx, GameTable.tsx, GameEndOverlay.tsx, RoundSummaryOverlay.tsx, PassingPhaseOverlay.tsx, ReceivedCardsOverlay.tsx, AIDebugOverlay.tsx
├── store/gameStore.ts, aiDebugStore.ts
├── hooks/useGameRealtime.ts, useRoomSync.ts, useRoomNavigationBlocker.ts, useGameEndHandler.ts, usePageUnloadWarning.ts
├── lib/
│   ├── constants.ts, roomApi.ts, slugGenerator.ts, aiPlayers.ts, sounds.ts, styles.ts, utils.ts
│   └── ai/
│       ├── index.ts (dispatches to strategies)
│       ├── types.ts (AI types, scoring constants, AI_VERSION=6)
│       ├── strategies/easy.ts, medium.ts, hard/hardStrategy.ts, hardHelpers.ts, leadScoring.ts, followScoring.ts, dumpScoring.ts, moonDetection.ts, moonEvaluation.ts
│       ├── utils/trickAnalysis.ts, suitAnalysis.ts, cardScoring.ts
│       └── memory/cardMemory.ts (recency-based, ~50% retention)
├── types/game.ts
└── game/deck.ts, cardDisplay.ts, rules.ts, gameLogic.ts, passingLogic.ts
```

## Database Schema
```sql
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_state JSONB NOT NULL,
  status TEXT DEFAULT 'waiting' -- 'waiting' | 'playing' | 'finished'
);
CREATE INDEX idx_game_rooms_slug ON game_rooms(slug);
```

## Type Definitions

### Core Types (`src/types/game.ts`)
- `Card`: `{ suit: CardSuit, rank: CardRank, points: number }`
- `CardSuit`: `"hearts" | "diamonds" | "clubs" | "spades"`
- `CardRank`: `2-14` (11=J, 12=Q, 13=K, 14=A)
- `Player`: `{ id, name, isAI, difficulty?: AIDifficulty, hand: Card[], score }`
- `AIDifficulty`: `"easy" | "medium" | "hard"`
- `PassDirection`: `"left" | "right" | "across" | "none"`
- `PassSubmission`: `{ playerId, cards: Card[] }`
- `GameState`: `{ players: Player[], hands: Card[][], currentTrick: Array<{playerId, card}>, lastCompletedTrick?, lastTrickWinnerIndex?, scores: number[], roundScores: number[], heartsBroken: boolean, currentPlayerIndex?, trickLeaderIndex?, dealerIndex?, roundNumber: number, currentTrickNumber: number, isRoundComplete?, isGameOver?, winnerIndex?, passDirection?, isPassingPhase?, passSubmissions?, isRevealPhase?, receivedCards?: Card[][], pointsCardsTaken?: Card[][], shotTheMoon?: {playerIndex} | null }`
- `GameRoom`: `{ id, slug, createdAt?, gameState: GameState, status }`

### Store (`src/store/gameStore.ts`)
- `GameStore`: `{ currentRoom: {roomId, slug, status}, players: Player[], gameState: GameState | null, ui: {isLoading, error}, setCurrentRoom(), updateGameState(), clearCurrentRoom(), setLoading(), setError() }`

## Key Functions

### Game Logic (`src/game/gameLogic.ts`)
- `playCard(gameState, playerId, card)`: Validates, plays card, handles trick completion, updates scores, checks round/game end, increments `currentTrickNumber` on trick complete
- `initializeRound(gameState)`: Finds player with 2♣, sets as first player, resets trick state, sets `currentTrickNumber: 1`
- `startRoundWithPassingPhase(gameState)`: Initiates passing phase or play
- `finalizePassingPhase(gameState)`: Transitions from passing to play
- `completeRevealPhase(gameState)`: Completes reveal phase, starts play
- `prepareNewRound(gameState)`: New round with new cards, resets `currentTrickNumber: 1`
- `resetGameForNewGame(gameState)`: Complete game reset

### Rules (`src/game/rules.ts`)
- `isFirstTrick(gameState)`: Uses `gameState.currentTrickNumber === 1`
- `getValidCards(gameState, playerId)`: Returns playable cards
- `canPlayCard(gameState, playerId, card)`: Validates specific card
- `getTrickWinner(trick, leadSuit)`: Highest card of lead suit
- `calculateTrickPoints(trick)`: Hearts=1pt, Q♠=13pts
- `checkShootingTheMoon(gameState)`: Detects moon (all 26 points)
- `applyShootingTheMoon(gameState, playerIndex)`: Applies moon scoring (26pts to others)

### Passing (`src/game/passingLogic.ts`)
- `getPassDirection(roundNumber)`: left→right→across→none rotation
- `getPassTargetIndex(fromIndex, direction)`: Calculates target player
- `submitPassSelection(gameState, playerId, cards)`: Records pass submission
- `executePassPhase(gameState)`: Swaps cards between players
- `processAIPasses(gameState)`: Handles all AI passes imperatively
- `allPlayersHavePassed(gameState)`: Checks if all submitted

### Deck (`src/game/deck.ts`)
- `generateDeck()`: Creates 52-card deck
- `shuffleDeck(deck)`: Fisher-Yates shuffle
- `dealCards(deck)`: Deals 13 cards to 4 players
- `sortHand(hand)`: Clubs→Diamonds→Spades→Hearts, ascending rank

### AI (`src/lib/ai/index.ts`)
- `chooseAICard(gameState, playerId)`: Main AI card selection (dispatches by difficulty)
- `chooseAIPassCards(gameState, playerId)`: AI passing selection
- `notifyTrickComplete(gameState)`: Updates Hard AI memory when tricks finish
- `resetAIForNewRound()`: Resets Hard AI memory for new rounds

**Easy AI** (`strategies/easy.ts`): Follow suit=lowest, Lead=random suit lowest, Pass=Q♠/high hearts/high cards

**Medium AI** (`strategies/medium.ts`): Penalty avoidance, Trick 1 safety (dump high cards), Spade fishing/protection, Strategic heart leads, Smart passing with voiding

**Hard AI** (`strategies/hard/`):
- Card memory: ~50% retention, recency bias, tracks voids
- Void detection: Avoids leading into known voids
- Q♠ awareness: Checks memory AND current trick (`isQueenOfSpadesAccountedFor()`)
- Proportional penalties: `WIN_WITH_POINTS_BASE=-40`, `PENALTY_POINTS_MULTIPLIER=-5` per point
- Moon detection: Score-based (Q♠+5+ hearts, 8+ hearts, 10+ hearts), behavioral (leading Q♠, high leads, voluntary wins), real-time (current trick analysis)
- Moon prevention: `STOP_MOON=150`, dump Q♠ on shooter=-350, dump hearts=-200, keep high cards
- Proactive moon shooting: `evaluateMoonPotential()` (A♥, Q♠ control, high cards), inverted passing (pass low, keep high), sneaky early game, abort on opponent penalty
- Leader targeting: Dump points on game leader
- Bluffing: Occasional safe trick-taking

**AI Utilities**:
- `utils/trickAnalysis.ts`: `getPenaltyPointsInTrick()`, `getHighestRankInTrick()`, `isLastToPlay()`
- `utils/suitAnalysis.ts`: `getSuitDistribution()`, `getCardsOfSuit()`, `hasProtectedHighCards()`, `getVoidingPassCandidates()`
- `utils/cardScoring.ts`: Shared passing phase scoring
- `memory/cardMemory.ts`: Recency-based memory, void tracking

### API (`src/lib/roomApi.ts`)
- `createRoom(slug)`: Creates room with initial game state
- `getRoomBySlug(slug)`: Fetches room
- `updateRoomGameState(slug, gameState)`: Updates game state
- `updateRoomStatus(slug, status)`: Updates status

### Hooks
- `useGameRealtime(slug)`: Supabase Realtime subscription, updates store, returns `{isConnected, error, unsubscribe}`
- `useRoomSync(room, slug)`: Syncs room data to store, invalidates query on status change
- `useRoomNavigationBlocker(props)`: Blocks navigation, handles confirmation, removes player, ends game if active
- `useGameEndHandler({room, isPlayerInRoom})`: Watches `finished` status, redirects to home
- `usePageUnloadWarning(props)`: Warns on page close/refresh (waiting room only)

## Constants (`src/lib/constants.ts`)
```typescript
STORAGE_KEYS = { PLAYER_ID: "hearts-player-id", PLAYER_NAME: "hearts-player-name" }
GAME_CONFIG = { MAX_PLAYERS: 4, CARDS_PER_PLAYER: 13, TOTAL_CARDS: 52 }
```

## AI Scoring Constants (`src/lib/ai/types.ts`)
- `AI_VERSION = 6`
- `RANK`: JACK=11, QUEEN=12, KING=13, ACE=14, thresholds
- `THRESHOLDS`: Early/late game, protection requirements
- `PASS_SCORES`: Passing phase weights
- `LEAD_SCORES`: Lead card weights
- `FOLLOW_SCORES`: Follow suit weights (`WIN_WITH_POINTS_BASE=-40`, `PENALTY_POINTS_MULTIPLIER=-5`)
- `DUMP_SCORES`: Dump card weights
- `DEFAULT_AI_CONFIG`: Behavior parameters

## Features

### Room Management
- Create/join/leave rooms via slug URLs
- Max 4 players, auto-fill with AI
- Status: `waiting` → `playing` → `finished`
- Player ID in localStorage (`hearts-player-id`)

### Real-time Sync
- Supabase Realtime subscription to `game_rooms` table
- Zustand store as local cache, synced via realtime
- Connection status indicator

### Game Flow
- Waiting: Players join, auto-start at 4 players
- Passing: Round 1-3 pass left/right/across, round 4 hold
- Reveal: Shows received cards
- Play: 13 tricks, clockwise turns, 2♣ leads first trick
- Round end: Score calculation, moon detection, round summary
- Game end: 100+ points triggers game over

### Hearts Rules
- First trick: Must lead 2♣, no hearts/Q♠ allowed
- Follow suit required, hearts broken after first heart played
- Scoring: Hearts=1pt, Q♠=13pts, Moon=26pts to others
- Winner: Lowest score wins

### UI/UX
- Poker table layout (felt texture, 4 positions)
- Card animations: Hand→center, winner animation, layout transitions
- Turn indicators: Yellow glow (current), green glow+crown (leader)
- AI indicators: 🤖 emoji
- Responsive scaling, no scrolling

### Animations
- AI play delay: 800ms
- Winner animation: 600ms delay, 1000ms duration
- Cards animate to winner, scale to zero
- Layout animations prevent card jumping

## Architecture Patterns

### State Management
- Single source of truth: Supabase database
- Zustand store: Local cache synced via realtime
- Data flow: Database → Realtime → Store → Components → Mutations → Database
- No state management via useEffect (only syncing, side effects, listeners)

### Type Safety
- Strict TypeScript, proper null handling (`??`), type-only imports

### Performance
- CSS transitions for hover (not JS animations)
- `willChange` hints, efficient rendering with keys, `clamp()` for sizing

### Card Sorting
- Sorted when dealt, stored in database
- Order: Clubs→Diamonds→Spades→Hearts, ascending rank
- Ensures consistency across clients

## Key Files

**`src/pages/GameRoom.tsx`**: Main game room, handles mutations (join/start/leave/play), AI auto-play with delays, animation state, AI memory lifecycle (`notifyTrickComplete`, `resetAIForNewRound`)

**`src/game/rules.ts`**: All validation (`isFirstTrick`, `getValidCards`, `canPlayCard`, `getTrickWinner`, `calculateTrickPoints`, `checkShootingTheMoon`)

**`src/game/gameLogic.ts`**: Core logic (`playCard`, `initializeRound`, `startRoundWithPassingPhase`, `finalizePassingPhase`, `completeRevealPhase`)

**`src/lib/ai/index.ts`**: AI dispatcher (`chooseAICard`, `chooseAIPassCards`, `notifyTrickComplete`, `resetAIForNewRound`)

**`src/lib/ai/strategies/hard/hardStrategy.ts`**: Main Hard AI class, moon attempt evaluation/abort

**`src/lib/ai/strategies/hard/moonDetection.ts`**: Multi-layered moon shooter detection

**`src/lib/ai/strategies/hard/moonEvaluation.ts`**: Moon shooting potential evaluation

**`src/lib/ai/memory/cardMemory.ts`**: Recency-based card memory

**`src/components/GameTable.tsx`**: Table layout, 4 positions, trick center, animations

**`src/components/CardHand.tsx`**: Fanned layout, selection highlighting, hover effects

**`src/store/gameStore.ts`**: Zustand store with state/actions

**`src/hooks/useGameRealtime.ts`**: Realtime subscription

**`src/lib/roomApi.ts`**: Supabase operations

## Debugging

**AI Debug Overlay** (`AIDebugOverlay.tsx`): Brain icon, scoring breakdown, Hard AI memory state (voids, moon suspicion/attempt), "Copy Logs" for LLM analysis

**AI Logs Format**: `[Round|Player|Difficulty|Action] Context -> Decision | Alternatives | {Memory}`. Shows `AI_VERSION`, `{Mem:X}` (cards tracked, max 28), `{Moon:PlayerName}`, `MOON ATTEMPT (X%)` / `(MOON)`

## Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## AI Version History
- v1: Initial implementation
- v2: Fixed `isFirstTrick()` bug, memory logic fixes, smarter heart leading
- v3: Fixed memory never updating, added lifecycle hooks
- v4: Explicit `currentTrickNumber` tracking, Q♠ current trick detection, proportional penalties
- v5: Low card protection (rank < 6) during passing
- v6: Proactive moon shooting, sophisticated moon detection, moon prevention strategy
