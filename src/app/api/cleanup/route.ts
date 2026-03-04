import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const EXPIRE_MINUTES = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000).toISOString();

  // Remove remote "on_my_way" entries that have been waiting over 30 min
  const { data, error } = await supabase
    .from("queue_entries")
    .update({ status: "removed" })
    .eq("status", "waiting")
    .eq("source", "remote")
    .eq("arrival_status", "on_my_way")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length ?? 0 });
}
