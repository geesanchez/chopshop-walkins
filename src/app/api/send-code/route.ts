import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

const SMS_LIMIT = 3;
const SMS_WINDOW_MINUTES = 15;

const SendCodeSchema = z.object({
  phone: z.string().min(1).max(20),
  turnstileToken: z.string().min(1, "Bot verification required"),
});

async function isRateLimited(
  supabase: ReturnType<typeof createServiceClient>,
  phone: string
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - SMS_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("sms_attempts")
    .select("count, window_start")
    .eq("phone", phone)
    .single();

  if (!data) return false;
  if (new Date(data.window_start).toISOString() < windowStart) return false;
  return data.count >= SMS_LIMIT;
}

async function recordAttempt(
  supabase: ReturnType<typeof createServiceClient>,
  phone: string
): Promise<void> {
  const windowStart = new Date(
    Date.now() - SMS_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("sms_attempts")
    .select("count, window_start")
    .eq("phone", phone)
    .single();

  if (!data || new Date(data.window_start).toISOString() < windowStart) {
    await supabase
      .from("sms_attempts")
      .upsert({ phone, count: 1, window_start: new Date().toISOString() });
  } else {
    await supabase
      .from("sms_attempts")
      .update({ count: data.count + 1 })
      .eq("phone", phone);
  }
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = SendCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 }
    );
  }

  // Verify Turnstile token with Cloudflare before doing anything else
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const cfRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: parsed.data.turnstileToken,
          remoteip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
        }),
      }
    );
    const cfData = await cfRes.json();
    if (!cfData.success) {
      return NextResponse.json(
        { error: "Bot verification failed. Please refresh and try again." },
        { status: 403 }
      );
    }
  }

  // Normalize: strip non-digits, ensure +1 prefix for US numbers
  const digits = parsed.data.phone.replace(/\D/g, "");
  const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

  if (e164.length !== 12) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit US phone number" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  if (await isRateLimited(supabase, e164)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  await recordAttempt(supabase, e164);

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: e164,
        channel: "sms",
      });

    return NextResponse.json({ success: true, phone: e164 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[send-code] Twilio error: ${msg}`);
    return NextResponse.json(
      { error: "Failed to send verification code. Try again." },
      { status: 500 }
    );
  }
}
