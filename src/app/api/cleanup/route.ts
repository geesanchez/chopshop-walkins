import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const REMOTE_EXPIRE_MINUTES = 30;
const WAITING_EXPIRE_MINUTES = 120; // 2 hours

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const remoteCutoff = new Date(Date.now() - REMOTE_EXPIRE_MINUTES * 60 * 1000).toISOString();
  const waitingCutoff = new Date(Date.now() - WAITING_EXPIRE_MINUTES * 60 * 1000).toISOString();

  // 1. Remove remote "on_my_way" entries that have been waiting over 30 min
  const { data: remoteExpired } = await supabase
    .from("queue_entries")
    .update({ status: "removed", completed_at: now })
    .eq("status", "waiting")
    .eq("source", "remote")
    .eq("arrival_status", "on_my_way")
    .lt("created_at", remoteCutoff)
    .select("id");

  // 2. Remove any waiting entries older than 2 hours (they probably left)
  const { data: waitingExpired } = await supabase
    .from("queue_entries")
    .update({ status: "removed", completed_at: now })
    .eq("status", "waiting")
    .lt("created_at", waitingCutoff)
    .select("id");

  // 3. Auto-complete in_progress entries that have been in chair for 2x their service duration
  const { data: inProgress } = await supabase
    .from("queue_entries")
    .select("id, called_at, services(duration_minutes)")
    .eq("status", "in_progress")
    .not("called_at", "is", null);

  let overdueCompleted = 0;
  if (inProgress) {
    for (const entry of inProgress) {
      const duration = (entry.services as unknown as { duration_minutes: number })?.duration_minutes ?? 45;
      const maxMinutes = duration * 2;
      const calledAt = new Date(entry.called_at!).getTime();
      const elapsed = (Date.now() - calledAt) / 60000;

      if (elapsed > maxMinutes) {
        await supabase
          .from("queue_entries")
          .update({ status: "completed", completed_at: now })
          .eq("id", entry.id);
        overdueCompleted++;
      }
    }
  }

  return NextResponse.json({
    remoteExpired: remoteExpired?.length ?? 0,
    waitingExpired: waitingExpired?.length ?? 0,
    overdueCompleted,
  });
}
