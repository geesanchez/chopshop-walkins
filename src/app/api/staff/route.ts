import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { verifyStaffRequest } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

const CallSchema = z.object({ action: z.literal("call"), entryId: z.string().uuid() });
const CompleteSchema = z.object({
  action: z.literal("complete"),
  entryId: z.string().uuid(),
  barberId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  serviceId: z.string().uuid(),
  source: z.string().min(1).max(20),
  calledAt: z.string().nullable(),
});
const EntryActionSchema = z.object({
  action: z.enum(["skip", "remove", "mark-arrived"]),
  entryId: z.string().uuid(),
});
const ToggleShopSchema = z.object({
  action: z.literal("toggle-shop"),
  settingsId: z.string().uuid(),
  isOpen: z.boolean(),
});
const SetQueueCapSchema = z.object({
  action: z.literal("set-queue-cap"),
  settingsId: z.string().uuid(),
  cap: z.number().int().min(1).max(30),
});
const SetBarbersSchema = z.object({
  action: z.literal("set-barbers"),
  settingsId: z.string().uuid(),
  count: z.number().int().min(1).max(10),
});
const AutoCleanupSchema = z.object({ action: z.literal("auto-cleanup") });

const StaffActionSchema = z.discriminatedUnion("action", [
  CallSchema,
  CompleteSchema,
  EntryActionSchema.extend({ action: z.literal("skip") }),
  EntryActionSchema.extend({ action: z.literal("remove") }),
  EntryActionSchema.extend({ action: z.literal("mark-arrived") }),
  ToggleShopSchema,
  SetQueueCapSchema,
  SetBarbersSchema,
  AutoCleanupSchema,
]);

function dbErr(action: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[staff/${action}] DB error: ${msg}`);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const { error, body } = await verifyStaffRequest(request);
  if (error) return error;

  const parsed = StaffActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = createServiceClient();

  switch (data.action) {
    case "call": {
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

      const { data: updatedEntry, error: updateErr } = await supabase
        .from("queue_entries")
        .update({
          status: "in_progress",
          called_at: new Date().toISOString(),
        })
        .eq("id", data.entryId)
        .select("customer_name, phone")
        .single();

      if (updateErr) return dbErr("call", updateErr);

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
          const msg = smsErr instanceof Error ? smsErr.message : "Unknown error";
          console.error(`[staff/call] SMS failed: ${msg}`);
        }
      }

      return NextResponse.json({ success: true });
    }

    case "complete": {
      const { error: updateErr } = await supabase
        .from("queue_entries")
        .update({
          status: "completed",
          assigned_barber_id: data.barberId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", data.entryId);

      if (updateErr) return dbErr("complete", updateErr);

      const { error: historyErr } = await supabase.from("cut_history").insert({
        customer_name: data.customerName,
        service_id: data.serviceId,
        barber_id: data.barberId,
        source: data.source,
        started_at: data.calledAt,
        completed_at: new Date().toISOString(),
      });

      if (historyErr) return dbErr("complete/history", historyErr);

      return NextResponse.json({ success: true });
    }

    case "skip": {
      const { error: e } = await supabase
        .from("queue_entries")
        .update({ status: "skipped" })
        .eq("id", data.entryId);

      if (e) return dbErr("skip", e);
      return NextResponse.json({ success: true });
    }

    case "remove": {
      const { error: e } = await supabase
        .from("queue_entries")
        .update({ status: "removed" })
        .eq("id", data.entryId);

      if (e) return dbErr("remove", e);
      return NextResponse.json({ success: true });
    }

    case "mark-arrived": {
      const { error: e } = await supabase
        .from("queue_entries")
        .update({ arrival_status: "here" })
        .eq("id", data.entryId);

      if (e) return dbErr("mark-arrived", e);
      return NextResponse.json({ success: true });
    }

    case "toggle-shop": {
      const { error: e } = await supabase
        .from("shop_settings")
        .update({ is_open: data.isOpen, updated_at: new Date().toISOString() })
        .eq("id", data.settingsId);

      if (e) return dbErr("toggle-shop", e);

      // When closing the shop, clear all active queue entries
      if (!data.isOpen) {
        const now = new Date().toISOString();
        await supabase
          .from("queue_entries")
          .update({ status: "removed", completed_at: now })
          .in("status", ["waiting", "in_progress"]);
      }

      return NextResponse.json({ success: true });
    }

    case "set-queue-cap": {
      const { error: e } = await supabase
        .from("shop_settings")
        .update({
          queue_cap: data.cap,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.settingsId);

      if (e) return dbErr("set-queue-cap", e);
      return NextResponse.json({ success: true });
    }

    case "set-barbers": {
      const { error: e } = await supabase
        .from("shop_settings")
        .update({
          active_barbers: data.count,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.settingsId);

      if (e) return dbErr("set-barbers", e);
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
