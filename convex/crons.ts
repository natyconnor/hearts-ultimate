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
crons.interval(
  "cleanup stale presence",
  { seconds: 30 },
  internal.cleanup.stalePresence
);

export default crons;
