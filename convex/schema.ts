import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Convex Auth tables (users, sessions, accounts, etc.)
  ...authTables,

  gameRooms: defineTable({
    slug: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("finished")
    ),
    gameState: v.any(), // GameState object - using v.any() for complex nested type
    spectators: v.array(v.object({ id: v.string(), name: v.string() })),
  }).index("by_slug", ["slug"]),

  userStats: defineTable({
    userId: v.id("users"), // References Convex Auth users table
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    totalPointsTaken: v.number(),
    moonsShot: v.number(),
  }).index("by_user", ["userId"]),

  // For presence tracking (replaces Supabase Presence)
  playerPresence: defineTable({
    roomSlug: v.string(),
    playerId: v.string(),
    playerName: v.string(),
    lastSeen: v.number(), // timestamp
  })
    .index("by_room", ["roomSlug"])
    .index("by_player", ["playerId"]),
});
