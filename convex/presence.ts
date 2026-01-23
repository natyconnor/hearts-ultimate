import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Presence is considered stale after 30 seconds of no heartbeat
const PRESENCE_TIMEOUT_MS = 30_000;

/**
 * Track a player's presence in a room (heartbeat)
 */
export const track = mutation({
  args: {
    roomSlug: v.string(),
    playerId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing presence record for this player
    const existing = await ctx.db
      .query("playerPresence")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        roomSlug: args.roomSlug,
        playerName: args.playerName,
        lastSeen: now,
      });
    } else {
      // Create new presence record
      await ctx.db.insert("playerPresence", {
        roomSlug: args.roomSlug,
        playerId: args.playerId,
        playerName: args.playerName,
        lastSeen: now,
      });
    }
  },
});

/**
 * Remove a player's presence (when they leave)
 */
export const untrack = mutation({
  args: {
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerPresence")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get all online players for a room
 */
export const getOnlinePlayers = query({
  args: { roomSlug: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - PRESENCE_TIMEOUT_MS;

    const presenceRecords = await ctx.db
      .query("playerPresence")
      .withIndex("by_room", (q) => q.eq("roomSlug", args.roomSlug))
      .collect();

    // Filter to only return players with recent heartbeats
    return presenceRecords.filter((p) => p.lastSeen > cutoff);
  },
});

/**
 * Internal mutation to clean up stale presence records
 * Called by cron job
 * Early-exits if ENABLE_PRESENCE_CRON is not set to "true" (for dev environments)
 */
export const cleanupStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Early exit if not enabled (for dev environments)
    // This prevents function execution but the cron still fires
    // To fully disable, set ENABLE_PRESENCE_CRON=false or don't set it
    if (process.env.ENABLE_PRESENCE_CRON !== "true") {
      return { deleted: 0, skipped: true };
    }

    const now = Date.now();
    const cutoff = now - PRESENCE_TIMEOUT_MS;

    // Get all stale presence records
    const allPresence = await ctx.db.query("playerPresence").collect();
    const stale = allPresence.filter((p) => p.lastSeen <= cutoff);

    // Delete stale records
    for (const record of stale) {
      await ctx.db.delete(record._id);
    }

    return { deleted: stale.length };
  },
});
