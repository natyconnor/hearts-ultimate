import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up abandoned rooms every hour
crons.interval(
  "cleanup abandoned rooms",
  { hours: 1 },
  internal.cleanup.abandonedRooms
);

// Clean stale presence records every 30 seconds
// Only enable in production to save on function call usage in dev
if (process.env.ENABLE_PRESENCE_CRON === "true") {
  crons.interval(
    "cleanup stale presence",
    { seconds: 30 },
    internal.cleanup.stalePresence
  );
}

export default crons;
