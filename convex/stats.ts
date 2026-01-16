import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get stats for the currently authenticated user
 */
export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Record a game result for the authenticated user
 */
export const recordGameResult = mutation({
  args: {
    won: v.boolean(),
    pointsTaken: v.number(),
    shotTheMoon: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // Anonymous user - no stats recorded

    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gamesPlayed: existing.gamesPlayed + 1,
        gamesWon: existing.gamesWon + (args.won ? 1 : 0),
        totalPointsTaken: existing.totalPointsTaken + args.pointsTaken,
        moonsShot: existing.moonsShot + (args.shotTheMoon ? 1 : 0),
      });
    } else {
      await ctx.db.insert("userStats", {
        userId,
        gamesPlayed: 1,
        gamesWon: args.won ? 1 : 0,
        totalPointsTaken: args.pointsTaken,
        moonsShot: args.shotTheMoon ? 1 : 0,
      });
    }
  },
});

/**
 * Migrate local stats from localStorage when user signs up/in
 * Adds local stats to any existing stats the user may have
 */
export const migrateLocalStats = mutation({
  args: {
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    totalPointsTaken: v.number(),
    moonsShot: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // Not authenticated

    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Add local stats to existing stats
      await ctx.db.patch(existing._id, {
        gamesPlayed: existing.gamesPlayed + args.gamesPlayed,
        gamesWon: existing.gamesWon + args.gamesWon,
        totalPointsTaken: existing.totalPointsTaken + args.totalPointsTaken,
        moonsShot: existing.moonsShot + args.moonsShot,
      });
    } else {
      // Create new stats record with local stats
      await ctx.db.insert("userStats", {
        userId,
        gamesPlayed: args.gamesPlayed,
        gamesWon: args.gamesWon,
        totalPointsTaken: args.totalPointsTaken,
        moonsShot: args.moonsShot,
      });
    }
  },
});
