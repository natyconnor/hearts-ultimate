# Hearts Ultimate - Project Summary

## Overview
A multiplayer Hearts card game built with React, TypeScript, Vite, and Supabase. The application supports real-time multiplayer gameplay with room-based matchmaking, featuring a beautiful modern UI with card animations and a poker table aesthetic.

## Tech Stack
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v7 (Data Router API)
- **Backend/Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Animations**: Framer Motion + CSS Transitions
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Project Structure

```
src/
├── App.tsx                    # Root component with routing setup
├── main.tsx                   # Application entry point
├── supabaseClient.ts          # Supabase client configuration
├── index.css                  # Tailwind CSS + theme variables
│
├── pages/
│   ├── Home.tsx              # Landing page with room creation
│   ├── CreateRoom.tsx        # Room creation component
│   └── GameRoom.tsx          # Main game room/lobby + game table
│
├── components/
│   ├── Card.tsx              # Individual playing card component
│   ├── CardHand.tsx          # Fanned card hand with animations
│   └── GameTable.tsx         # Game table layout with 4 player positions
│
├── store/
│   └── gameStore.ts          # Zustand store for game state
│
├── hooks/
│   ├── useGameRealtime.ts           # Supabase Realtime subscription
│   ├── useRoomSync.ts               # Syncs room data to store
│   ├── useRoomNavigationBlocker.ts  # Navigation blocking logic
│   ├── useGameEndHandler.ts          # Handles game ending
│   └── usePageUnloadWarning.ts      # Page unload warnings
│
├── lib/
│   ├── constants.ts          # App-wide constants
│   ├── roomApi.ts            # Supabase room operations
│   ├── slugGenerator.ts      # Room slug generation utility
│   ├── aiPlayers.ts          # AI player creation utilities
│   └── utils.ts              # Utility functions (cn helper)
│
├── types/
│   └── game.ts               # TypeScript type definitions
│
└── game/
    ├── deck.ts               # Card deck utilities (generate, shuffle, deal, sort)
    └── cardDisplay.ts        # Card formatting utilities
```

## Database Schema

### `game_rooms` table
```sql
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_state JSONB NOT NULL,
  status TEXT DEFAULT 'waiting'
);

CREATE INDEX idx_game_rooms_slug ON game_rooms(slug);
```

**Fields:**
- `id`: Unique room identifier
- `slug`: Human-readable room identifier (e.g., "brave-lion-42")
- `created_at`: Timestamp
- `game_state`: JSONB containing full game state (players, hands, scores, etc.)
- `status`: One of `"waiting" | "playing" | "finished"`

## Type Definitions

### Core Types (`src/types/game.ts`)
- `Card`: `{ suit: CardSuit, rank: CardRank }`
- `CardSuit`: `"hearts" | "diamonds" | "clubs" | "spades"`
- `CardRank`: `2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14` (11=J, 12=Q, 13=K, 14=A)
- `Player`: `{ id, name, isAI, hand: Card[], score }`
- `GameState`: `{ players, hands, currentTrick, scores, heartsBroken, currentPlayerIndex?, dealerIndex? }`
- `GameRoom`: `{ id, slug, createdAt?, gameState, status }`

### Store Types (`src/store/gameStore.ts`)
- `CurrentRoom`: `{ roomId, slug, status }` (all nullable)
- `GameStore`: Zustand store interface with state and actions

## Key Features Implemented

### 1. Room Management
- **Create Room**: Generates unique slug, creates room in Supabase
- **Join Room**: Players can join via slug URL
- **Leave Room**: Players can leave (ends game if active)
- **Room Status**: Tracks `waiting`, `playing`, `finished` states

### 2. Player Management
- **Player Identification**: Uses localStorage to persist player ID
- **Player Limits**: Maximum 4 players per room
- **Duplicate Prevention**: Prevents same player joining twice
- **AI Players**: Automatic AI player creation to fill empty slots
- **AI Names**: Predefined names (Alice, Bob, Charlie, Diana) with fallback

### 3. Real-time Synchronization
- **Supabase Realtime**: Subscribes to `game_rooms` table changes
- **Automatic Updates**: All players see changes instantly
- **Status Sync**: Room status changes propagate to all clients
- **Connection Status**: Shows realtime connection state with visual indicator

### 4. Navigation Protection
- **Route Blocking**: Blocks navigation when player is in room
- **Confirmation Dialogs**: Prompts before leaving active/waiting rooms
- **Browser Warning**: Warns on page close/refresh
- **Cleanup**: Properly removes player on navigation

### 5. Game Lifecycle
- **Waiting Phase**: Players join, room accepts up to 4 players
- **Start Game**: Requires 4 players, automatically deals cards, changes status to `playing`
- **Card Dealing**: Shuffles deck, deals 13 cards to each player, sorts hands
- **Game End**: If player leaves during active game, status changes to `finished`
- **Auto-redirect**: All players redirected to home when game ends

### 6. UI/UX Features
- **Modern Design**: Tailwind CSS v4 with custom poker-green theme
- **Game Table**: Beautiful poker table layout with felt texture
- **Card Components**: Realistic playing cards with suit/rank display
- **Card Animations**: Smooth fanning effect with CSS transitions for hover
- **Responsive Layout**: Scales with window size, no scrolling
- **Sleek Header**: Room name, connection status, and navigation in one place
- **Player Positions**: 4 positions around table (bottom=user, top/left/right=others)

## State Management Architecture

### Zustand Store (`gameStore.ts`)
**State:**
- `currentRoom`: Current room metadata
- `players`: Array of players (derived from gameState)
- `gameState`: Full game state object
- `ui`: Loading and error states

**Actions:**
- `setCurrentRoom()`: Updates current room info
- `updateGameState()`: Updates full game state
- `clearCurrentRoom()`: Clears room state
- `setLoading()`, `setError()`: UI state management

### Data Flow
```
Supabase Database
    ↓ (Realtime)
useGameRealtime Hook
    ↓ (Updates)
Zustand Store
    ↓ (Subscriptions)
React Components
    ↓ (User Actions)
Mutations (TanStack Query)
    ↓ (Updates)
Supabase Database
```

## Custom Hooks

### `useGameRealtime(slug)`
- Subscribes to Supabase Realtime channel for specific room
- Updates Zustand store on `game_state` and `status` changes
- Returns `{ isConnected, error, unsubscribe }`

### `useRoomSync(room, slug)`
- Syncs room data from query to Zustand store
- Invalidates query when status changes via realtime

### `useRoomNavigationBlocker(props)`
- Blocks navigation when player is in room
- Handles confirmation and player removal
- Ends game if leaving during active play

### `useGameEndHandler({ room, isPlayerInRoom })`
- Watches for `finished` status
- Redirects all players to home when game ends

### `usePageUnloadWarning(props)`
- Warns user before closing/refreshing page
- Only active when player is in waiting room

## API Functions (`src/lib/roomApi.ts`)

- `createRoom(slug)`: Creates new room with initial game state
- `getRoomBySlug(slug)`: Fetches room by slug
- `updateRoomGameState(slug, gameState)`: Updates game state in database
- `updateRoomStatus(slug, status)`: Updates room status

## Game Utilities

### Card Deck (`src/game/deck.ts`)
- `generateDeck()`: Creates full 52-card deck
- `shuffleDeck(deck)`: Fisher-Yates shuffle algorithm
- `dealCards(deck)`: Deals 13 cards to each of 4 players
- `createAndDeal()`: Convenience function (generate + shuffle + deal)
- `sortHand(hand)`: Sorts cards by suit (clubs, diamonds, spades, hearts) then rank

### AI Players (`src/lib/aiPlayers.ts`)
- `createAIPlayer(name)`: Creates an AI player with unique ID
- `getNextAIName(existingPlayers)`: Gets next available AI name
- `createAIPlayersToFillSlots(existingPlayers)`: Creates AI players to fill to 4 total

### Card Display (`src/game/cardDisplay.ts`)
- `formatCard(card)`: Formats single card as string (e.g., "K♥")
- `formatHand(hand)`: Formats hand as comma-separated string
- `formatHandGrouped(hand)`: Formats hand grouped by suit

## Constants (`src/lib/constants.ts`)

```typescript
STORAGE_KEYS = {
  PLAYER_ID: "hearts-player-id",
  PLAYER_NAME: "hearts-player-name",
}

GAME_CONFIG = {
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 13,
  TOTAL_CARDS: 52,
}
```

## Styling & Design

### Tailwind CSS v4 Setup
- **CSS-first Configuration**: Uses `@theme inline` directive
- **Custom Colors**: Poker-green theme color (`#064e3b`)
- **shadcn/ui**: Component library integration
- **PostCSS**: Configured with `@tailwindcss/postcss`
- **Animations**: `tw-animate-css` for CSS animations

### Components

#### `Card.tsx`
- Realistic playing card design
- White background, rounded corners, shadow
- Suit symbols and rank in corners
- Large suit icon in center
- Card back design with blue gradient and pattern
- Responsive sizing (w-24 h-36 mobile, w-28 h-40 desktop)

#### `CardHand.tsx`
- Fanned card layout with rotation
- Spring animations for card dealing
- CSS transitions for hover (optimized performance)
- Arc effect (cards at edges slightly lower)
- Dynamic spacing based on card count

#### `GameTable.tsx`
- Poker table layout with felt texture
- Rounded rectangle design with wooden border
- 4 player positions around table
- Center area for current trick
- Responsive scaling with window size
- No scrolling (flexbox layout)

## Routing

### Routes (`src/App.tsx`)
- `/` → `Home` component
- `/room/:slug` → `GameRoom` component

### Router Setup
- Uses React Router v7 Data Router API (`createBrowserRouter`)
- Required for `useBlocker` hook support
- Layout component with conditional navbar (hidden in game room)

## Player Identification

- **Storage**: Player ID stored in `localStorage` as `"hearts-player-id"`
- **Persistence**: Survives page refreshes
- **Generation**: Format: `player-{timestamp}-{random}`
- **AI Generation**: Format: `ai-player-{timestamp}-{random}`
- **Validation**: Checked against room's player list

## Current Implementation Status

### ✅ Completed

#### Core Infrastructure
- Room creation and joining
- Real-time synchronization (Supabase Realtime)
- Player management (join/leave)
- AI player creation
- Navigation protection
- Game lifecycle (waiting → playing → finished)
- Card dealing and hand management
- Card sorting (by suit then rank)
- Error handling
- Type safety throughout
- Code organization and cleanup

#### Game Rules & Logic (`src/game/rules.ts`)
- ✅ First trick must start with 2 of clubs
- ✅ Follow suit validation
- ✅ Hearts breaking rules (can't lead hearts until broken)
- ✅ First trick penalty card restrictions (no hearts/Q♠)
- ✅ Trick winner determination (highest card of lead suit)
- ✅ Point calculation (hearts = 1pt, Q♠ = 13pts)
- ✅ Round completion detection
- ✅ Shooting the moon detection and scoring
- ✅ Valid card filtering for UI

#### Game Logic (`src/game/gameLogic.ts`)
- ✅ `playCard()` - Complete card playing logic with validation
- ✅ `initializeRound()` - Sets first player (who has 2♣)
- ✅ Turn management (clockwise rotation)
- ✅ Trick completion handling
- ✅ Score tracking (round scores and cumulative scores)
- ✅ Hearts broken status tracking
- ✅ Round completion and game end detection

#### Turn-Based Gameplay
- ✅ Current player tracking (`currentPlayerIndex`)
- ✅ Trick leader tracking (`trickLeaderIndex`)
- ✅ Turn indicators (yellow glow for current player)
- ✅ Leader indicators (green glow + crown emoji)
- ✅ Clockwise turn order enforcement

#### Card Playing & UI
- ✅ Click-to-play card selection (no confirmation needed)
- ✅ Card validation with visual feedback (dimmed invalid cards)
- ✅ Selected card highlighting (scales up and lifts)
- ✅ Smooth card animations from hand to center
- ✅ Cards positioned relative to player positions
- ✅ Trick cards form circle around center
- ✅ Last completed trick display for animations

#### Trick Completion & Animations
- ✅ Winner announcement badge (positioned above cards)
- ✅ Winning card highlighting (green ring)
- ✅ Cards animate smoothly to winner's position
- ✅ Cards scale to zero as they reach winner
- ✅ Proper timing delays between plays
- ✅ AI players wait for animations to complete

#### Scoring System
- ✅ Round scores tracking (`roundScores` array)
- ✅ Cumulative game scores (`scores` array)
- ✅ Shooting the moon handling (26 points to others)
- ✅ Score display for each player
- ✅ Game end detection (100+ points)

#### AI Player Logic (`src/lib/aiDecision.ts`)
- ✅ Basic AI decision making (`chooseAICard`)
- ✅ Follow suit logic (plays lowest card of lead suit)
- ✅ Leading logic (randomly selects suit, plays lowest)
- ✅ Valid card filtering
- ✅ AI auto-play with realistic delays (800ms)
- ✅ Prevents simultaneous AI plays

#### UI/UX Features
- ✅ Modern design with Tailwind CSS v4
- ✅ Poker table layout with felt texture
- ✅ Realistic playing cards with suit/rank display
- ✅ Smooth card fanning animations
- ✅ Card hover effects (scale and lift)
- ✅ Layout animations (cards slide smoothly when repositioning)
- ✅ Responsive design (scales with window size)
- ✅ Player name badges with turn/leader indicators
- ✅ AI player indicators (🤖 emoji)
- ✅ Full hand display for all players (no card count limits)
- ✅ Winner animations and transitions
- ✅ No card shifting when winner badge appears

### 🎯 Next Steps

#### High Priority
1. **Card Passing Phase** (before each round)
   - Implement 3-card passing before round starts
   - Pass direction rotation (left, right, across, none)
   - UI for selecting cards to pass
   - Validation and state management

2. **Enhanced AI Strategy**
   - Improve AI decision making beyond basic "lowest card"
   - Avoid taking tricks with penalty cards
   - Strategic Queen of Spades play
   - Hearts breaking strategy
   - Shooting the moon detection and attempts

3. **Game End & Round Management**
   - Better game end UI (show final scores, winner)
   - Round transition animations
   - New round initialization with passing
   - Game history/replay

#### Medium Priority
4. **UI Polish**
   - Sound effects for card plays
   - More animation polish
   - Better mobile responsiveness
   - Card flip animations for opponents

5. **Game Features**
   - Undo/redo (if desired)
   - Spectator mode
   - Game statistics tracking
   - Leaderboards

#### Low Priority / Future Enhancements
6. **Social Features**
   - Player profiles
   - Friends list
   - Private rooms
   - Chat functionality

7. **Advanced Features**
   - Tournament mode
   - Custom game rules
   - Replay system
   - Game analysis

## Important Patterns & Decisions

### 1. Single Source of Truth
- Supabase database is the source of truth
- Zustand store is a local cache
- Realtime keeps cache in sync

### 2. No State Management via useEffect
- Effects only for: syncing external data, side effects, event listeners
- State updates happen via mutations and store actions

### 3. Custom Hooks for Complex Logic
- Navigation blocking logic extracted
- Room syncing extracted
- Game end handling extracted
- Makes code testable and reusable

### 4. Type Safety
- All data structures typed
- Proper null handling with `??` operator
- Type-only imports where appropriate

### 5. Error Handling
- Mutations show user-friendly error messages
- Realtime connection errors displayed
- Graceful fallbacks for missing data

### 6. Performance Optimizations
- CSS transitions for hover (faster than JS animations)
- `willChange` hints for browser optimization
- Efficient card rendering with proper keys
- Responsive sizing with clamp()

### 7. Card Sorting
- Hands sorted when dealt (stored in database)
- Sort order: clubs → diamonds → spades → hearts
- Within suit: ascending rank (2-A)
- Ensures consistency across all clients

## Environment Variables Required

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Key Files to Understand

1. **`src/pages/GameRoom.tsx`**: Main game room component
   - Handles all room interactions
   - Manages mutations (join, start, leave, add AI)
   - Uses custom hooks for side effects
   - Renders lobby view or game table

2. **`src/components/GameTable.tsx`**: Game table layout
   - 4 player positions around table
   - Center trick area
   - Responsive scaling

3. **`src/components/CardHand.tsx`**: Card hand component
   - Fanned card layout
   - Smooth animations
   - Hover effects

4. **`src/store/gameStore.ts`**: Global state management
   - Single Zustand store for app state
   - Actions for updating state

5. **`src/hooks/useGameRealtime.ts`**: Real-time updates
   - Supabase Realtime subscription
   - Updates store on changes

6. **`src/lib/roomApi.ts`**: Database operations
   - All Supabase queries/mutations
   - Error handling

7. **`src/game/deck.ts`**: Card utilities
   - Deck generation, shuffling, dealing
   - Hand sorting

## Next Steps (Suggested)

1. **Game Rules**: Implement Hearts card game rules
   - First trick must be 2 of clubs
   - Follow suit rules
   - Hearts can't be led until broken
   - Queen of Spades penalty

2. **Turn Management**: Track current player, validate moves
   - Current player indicator
   - Turn order rotation
   - Move validation

3. **Card Playing Logic**: Implement card selection and playing
   - Click handler for playing cards
   - Remove card from hand
   - Add to current trick
   - Update game state

4. **Trick Completion**: Handle trick completion
   - Determine trick winner
   - Award points
   - Clear trick
   - Move to next player

5. **Scoring**: Calculate and display scores
   - Hearts = 1 point each
   - Queen of Spades = 13 points
   - Shooting the moon (26 points to others)
   - Round and game totals

6. **AI Player Logic**: Implement AI decision making
   - Card selection strategy
   - Follow suit logic
   - Hearts breaking logic
   - Queen of Spades avoidance

7. **Game Round Management**: Handle round completion
   - Check for game end (100+ points)
   - Start new round
   - Reset hands and scores

8. **Passing Phase**: Implement card passing (if desired)
   - Pass 3 cards before each round
   - Pass direction rotation
   - Validation

## Notes

- All code follows modern React patterns
- TypeScript strict mode enabled
- No console.logs in production code
- Constants extracted to separate file
- Custom hooks for reusable logic
- Proper cleanup on component unmount
- Navigation blocking works correctly
- Real-time updates tested and working
- Cards sorted consistently across all clients
- UI optimized for performance (CSS transitions)
- Responsive design scales with window size
- Tailwind CSS v4 with CSS-first configuration
