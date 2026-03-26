import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

const VERIFY_LIMIT = 5;
const VERIFY_WINDOW_MINUTES = 15;

const VerifyCodeSchema = z.object({
  phone: z.string().min(1).max(20),
  code: z.string().min(4).max(10),
});

async function isRateLimited(
  supabase: ReturnType<typeof createServiceClient>,
  phone: string
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - VERIFY_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("sms_attempts")
    .select("count, window_start")
    .eq("phone", phone)
    .single();

  if (!data) return false;
  if (new Date(data.window_start).toISOString() < windowStart) return false;
  return data.count >= VERIFY_LIMIT;
}

async function recordAttempt(
  supabase: ReturnType<typeof createServiceClient>,
  phone: string
): Promise<void> {
  const windowStart = new Date(
    Date.now() - VERIFY_WINDOW_MINUTES * 60 * 1000
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
  const parsed = VerifyCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phone and code required" },
      { status: 400 }
    );
  }

  // Normalize phone for rate limit lookup (same logic as send-code)
  const digits = parsed.data.phone.replace(/\D/g, "");
  const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

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
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: e164,
        code: parsed.data.code,
      });

    if (check.status === "approved") {
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json(
      { error: "Invalid code. Try again." },
      { status: 401 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[verify-code] Twilio error: ${msg}`);
    return NextResponse.json(
      { error: "Verification failed. Request a new code." },
      { status: 500 }
    );
  }
}
