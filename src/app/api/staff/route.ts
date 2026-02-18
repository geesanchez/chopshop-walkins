import { NextRequest, NextResponse } from "next/server";
import { verifyStaffRequest } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { error, body } = await verifyStaffRequest(request);
  if (error) return error;

  const action = body!.action as string;
  const supabase = createServiceClient();

  switch (action) {
    case "call": {
      const { entryId } = body as { entryId: string };

      // Check barber availability before calling
      const { count: inProgressCount } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress");

      const { data: settings } = await supabase
        .from("shop_settings")
        .select("active_barbers")
        .limit(1)
        .single();

      if (settings && inProgressCount !== null && inProgressCount >= settings.active_barbers) {
        return NextResponse.json(
          { error: "All barbers are busy. Complete a cut before calling the next person." },
          { status: 409 }
        );
      }

      const { error: dbError } = await supabase
        .from("queue_entries")
        .update({
          status: "in_progress",
          called_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "complete": {
      const { entryId, barberId, customerName, serviceId, source, calledAt } =
        body as {
          entryId: string;
          barberId: string;
          customerName: string;
          serviceId: string;
          source: string;
          calledAt: string | null;
        };

      const { error: updateError } = await supabase
        .from("queue_entries")
        .update({
          status: "completed",
          assigned_barber_id: barberId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 });

      const { error: historyError } = await supabase.from("cut_history").insert({
        customer_name: customerName,
        service_id: serviceId,
        barber_id: barberId,
        source,
        started_at: calledAt,
        completed_at: new Date().toISOString(),
      });

      if (historyError)
        return NextResponse.json({ error: historyError.message }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    case "skip": {
      const { entryId } = body as { entryId: string };
      const { error: dbError } = await supabase
        .from("queue_entries")
        .update({ status: "skipped" })
        .eq("id", entryId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "remove": {
      const { entryId } = body as { entryId: string };
      const { error: dbError } = await supabase
        .from("queue_entries")
        .update({ status: "removed" })
        .eq("id", entryId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "mark-arrived": {
      const { entryId } = body as { entryId: string };
      const { error: dbError } = await supabase
        .from("queue_entries")
        .update({ arrival_status: "here" })
        .eq("id", entryId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "toggle-shop": {
      const { settingsId, isOpen } = body as {
        settingsId: string;
        isOpen: boolean;
      };
      const { error: dbError } = await supabase
        .from("shop_settings")
        .update({ is_open: isOpen, updated_at: new Date().toISOString() })
        .eq("id", settingsId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "set-barbers": {
      const { settingsId, count } = body as {
        settingsId: string;
        count: number;
      };
      const { error: dbError } = await supabase
        .from("shop_settings")
        .update({
          active_barbers: count,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingsId);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
