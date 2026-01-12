import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const HOURS_UNTIL_ABANDONED = 24;

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

Deno.serve(async (req): Promise<Response> => {
  try {
    // Optional: Verify authorization for manual invocations
    // The cron job will include the service role key automatically
    const authHeader = req.headers.get("Authorization");
    if (!authHeader && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date(
      Date.now() - HOURS_UNTIL_ABANDONED * 60 * 60 * 1000
    ).toISOString();

    console.log(`Cleaning up rooms not updated since: ${cutoffTime}`);

    // Delete abandoned rooms:
    // - Rooms in "waiting" status that haven't been updated in 24 hours
    // - Rooms in "finished" status that haven't been updated in 24 hours
    // - Any room that hasn't been updated in 24 hours (catches edge cases)
    const { data, error } = await supabase
      .from("game_rooms")
      .delete()
      .lt("updated_at", cutoffTime)
      .select("id, slug, status, updated_at");

    if (error) {
      console.error("Error deleting abandoned rooms:", error);
      const result: CleanupResult = {
        success: false,
        deletedCount: 0,
        error: error.message,
      };
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const deletedCount = data?.length ?? 0;

    if (deletedCount > 0) {
      console.log(`Successfully deleted ${deletedCount} abandoned rooms:`);
      data?.forEach((room) => {
        console.log(
          `  - ${room.slug} (status: ${room.status}, last updated: ${room.updated_at})`
        );
      });
    } else {
      console.log("No abandoned rooms found to delete.");
    }

    const result: CleanupResult = {
      success: true,
      deletedCount,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in cleanup-rooms function:", err);
    const result: CleanupResult = {
      success: false,
      deletedCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
