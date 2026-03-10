import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPin, verifyPin, createSessionToken, verifySessionToken } from "@/lib/pin-hash";

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

const PinSchema = z.object({
  pin: z.string().min(1).max(20),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function checkRateLimit(
  supabase: ReturnType<typeof createServiceClient>,
  ip: string
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  // Get current attempts for this IP
  const { data } = await supabase
    .from("pin_attempts")
    .select("count, window_start")
    .eq("ip", ip)
    .single();

  if (!data) return false; // No attempts yet

  // If window has expired, not rate limited
  if (new Date(data.window_start).toISOString() < windowStart) return false;

  return data.count >= MAX_ATTEMPTS;
}

async function recordAttempt(
  supabase: ReturnType<typeof createServiceClient>,
  ip: string
): Promise<void> {
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("pin_attempts")
    .select("count, window_start")
    .eq("ip", ip)
    .single();

  if (!data || new Date(data.window_start).toISOString() < windowStart) {
    // New window — upsert with count 1
    await supabase
      .from("pin_attempts")
      .upsert({ ip, count: 1, window_start: new Date().toISOString() });
  } else {
    // Same window — increment
    await supabase
      .from("pin_attempts")
      .update({ count: data.count + 1 })
      .eq("ip", ip);
  }
}

// Check if existing session cookie is valid
export async function GET(request: NextRequest) {
  const token = request.cookies.get("staff_session")?.value;
  if (token && verifySessionToken(token)) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = PinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "PIN required" },
      { status: 400 }
    );
  }

  const { pin } = parsed.data;
  const supabase = createServiceClient();
  const ip = getClientIp(request);

  // Check rate limit
  const limited = await checkRateLimit(supabase, ip);
  if (limited) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const { data } = await supabase
    .from("shop_settings")
    .select("staff_pin_hash")
    .limit(1)
    .single();

  let valid = false;

  if (data?.staff_pin_hash) {
    valid = verifyPin(pin, data.staff_pin_hash);
  } else if (pin === process.env.STAFF_PIN) {
    await supabase
      .from("shop_settings")
      .update({ staff_pin_hash: hashPin(pin) })
      .not("id", "is", null);
    valid = true;
  }

  if (!valid) {
    await recordAttempt(supabase, ip);
    return NextResponse.json(
      { success: false, error: "Invalid PIN" },
      { status: 401 }
    );
  }

  // Clear attempts on success
  await supabase.from("pin_attempts").delete().eq("ip", ip);

  // Set HTTP-only cookie with session token
  const token = createSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set("staff_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours
  });

  return response;
}
