import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
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

      const { data: updatedEntry, error: dbError } = await supabase
        .from("queue_entries")
        .update({
          status: "in_progress",
          called_at: new Date().toISOString(),
        })
        .eq("id", entryId)
        .select("customer_name, phone")
        .single();

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

      // Send SMS notification if customer has a phone number
      if (updatedEntry?.phone && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          await twilioClient.messages.create({
            to: updatedEntry.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: `Hey ${updatedEntry.customer_name}! You're up next at The Chop Shop. Head to the chair!`,
          });
        } catch (smsErr) {
          console.error("SMS notification failed:", smsErr);
        }
      }

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

      // When closing the shop, clear all active queue entries
      if (!isOpen) {
        const now = new Date().toISOString();

        await supabase
          .from("queue_entries")
          .update({ status: "removed", completed_at: now })
          .in("status", ["waiting", "in_progress"]);
      }

      return NextResponse.json({ success: true });
    }

    case "set-queue-cap": {
      const { settingsId, cap } = body as {
        settingsId: string;
        cap: number;
      };
      if (cap < 1 || cap > 30) {
        return NextResponse.json({ error: "Queue cap must be between 1 and 30" }, { status: 400 });
      }
      const { error: dbError } = await supabase
        .from("shop_settings")
        .update({
          queue_cap: cap,
          updated_at: new Date().toISOString(),
        })
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

    case "auto-cleanup": {
      const now = new Date().toISOString();
      const waitingCutoff = new Date(Date.now() - 120 * 60 * 1000).toISOString();

      // Remove waiting entries older than 2 hours
      const { data: waitingExpired } = await supabase
        .from("queue_entries")
        .update({ status: "removed", completed_at: now })
        .eq("status", "waiting")
        .lt("created_at", waitingCutoff)
        .select("id");

      // Auto-complete in_progress entries past 2x their service duration
      const { data: inProgress } = await supabase
        .from("queue_entries")
        .select("id, called_at, services(duration_minutes)")
        .eq("status", "in_progress")
        .not("called_at", "is", null);

      let overdueCompleted = 0;
      if (inProgress) {
        for (const entry of inProgress) {
          const duration = (entry.services as unknown as { duration_minutes: number })?.duration_minutes ?? 45;
          const calledAt = new Date(entry.called_at!).getTime();
          const elapsed = (Date.now() - calledAt) / 60000;

          if (elapsed > duration * 2) {
            await supabase
              .from("queue_entries")
              .update({ status: "completed", completed_at: now })
              .eq("id", entry.id);
            overdueCompleted++;
          }
        }
      }

      return NextResponse.json({
        waitingExpired: waitingExpired?.length ?? 0,
        overdueCompleted,
      });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
