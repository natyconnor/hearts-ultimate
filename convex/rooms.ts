import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Initial game state for new rooms
const initialGameState = {
  players: [],
  hands: [],
  currentTrick: [],
  lastCompletedTrick: undefined,
  lastTrickWinnerIndex: undefined,
  scores: [0, 0, 0, 0],
  roundScores: [0, 0, 0, 0],
  heartsBroken: false,
  roundNumber: 1,
  currentTrickNumber: 1,
  isRoundComplete: false,
  isGameOver: false,
  winnerIndex: undefined,
};

/**
 * Get a room by its slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Create a new game room
 */
export const create = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Check if room already exists
    const existing = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Room with slug "${args.slug}" already exists`);
    }

    const roomId = await ctx.db.insert("gameRooms", {
      slug: args.slug,
      status: "waiting",
      gameState: initialGameState,
      spectators: [],
    });

    return await ctx.db.get(roomId);
  },
});

/**
 * Update the game state for a room
 */
export const updateGameState = mutation({
  args: {
    slug: v.string(),
    gameState: v.any(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!room) {
      throw new Error(`Room "${args.slug}" not found`);
    }

    await ctx.db.patch(room._id, { gameState: args.gameState });
  },
});

/**
 * Update the room status
 */
export const updateStatus = mutation({
  args: {
    slug: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("finished")
    ),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!room) {
      throw new Error(`Room "${args.slug}" not found`);
    }

    await ctx.db.patch(room._id, { status: args.status });
  },
});

/**
 * Delete a room by its slug
 */
export const deleteRoom = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (room) {
      await ctx.db.delete(room._id);
    }
  },
});

/**
 * Add a spectator to a room
 */
export const joinAsSpectator = mutation({
  args: {
    slug: v.string(),
    spectator: v.object({ id: v.string(), name: v.string() }),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!room) {
      throw new Error(`Room "${args.slug}" not found`);
    }

    // Check if already a spectator
    if (room.spectators.some((s) => s.id === args.spectator.id)) {
      return room.spectators;
    }

    const updatedSpectators = [...room.spectators, args.spectator];
    await ctx.db.patch(room._id, { spectators: updatedSpectators });

    return updatedSpectators;
  },
});

/**
 * Remove a spectator from a room
 */
export const leaveAsSpectator = mutation({
  args: {
    slug: v.string(),
    spectatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!room) {
      throw new Error(`Room "${args.slug}" not found`);
    }

    const updatedSpectators = room.spectators.filter(
      (s) => s.id !== args.spectatorId
    );
    await ctx.db.patch(room._id, { spectators: updatedSpectators });

    return updatedSpectators;
  },
});

/**
 * Update spectators list for a room
 */
export const updateSpectators = mutation({
  args: {
    slug: v.string(),
    spectators: v.array(v.object({ id: v.string(), name: v.string() })),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("gameRooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!room) {
      throw new Error(`Room "${args.slug}" not found`);
    }

    await ctx.db.patch(room._id, { spectators: args.spectators });
  },
});
