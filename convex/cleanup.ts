import { internalMutation } from "./_generated/server";

// Rooms are considered abandoned after 24 hours of no activity
const HOURS_UNTIL_ABANDONED = 24;
const ABANDONED_TIMEOUT_MS = HOURS_UNTIL_ABANDONED * 60 * 60 * 1000;

/**
 * Clean up abandoned game rooms
 * A room is abandoned if it hasn't been updated in 24 hours
 */
export const abandonedRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - ABANDONED_TIMEOUT_MS;

    // Get all rooms
    const allRooms = await ctx.db.query("gameRooms").collect();

    // Filter to abandoned rooms (created more than 24 hours ago)
    // Since Convex doesn't have an updatedAt field by default, we'll use _creationTime
    // and check if the room is in waiting or finished status
    const abandoned = allRooms.filter((room) => {
      const creationTime = room._creationTime;
      const isOld = creationTime < cutoff;
      const isNotActive =
        room.status === "waiting" || room.status === "finished";
      return isOld && isNotActive;
    });

    // Delete abandoned rooms
    for (const room of abandoned) {
      await ctx.db.delete(room._id);
    }

    return {
      deleted: abandoned.length,
      checked: allRooms.length,
    };
  },
});

/**
 * Re-export stale presence cleanup from presence module
 */
export { cleanupStale as stalePresence } from "./presence";
