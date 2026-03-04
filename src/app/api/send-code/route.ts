import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Simple in-memory rate limit: max 3 SMS per phone per 15 minutes
const smsAttempts = new Map<string, { count: number; resetAt: number }>();
const SMS_LIMIT = 3;
const SMS_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = smsAttempts.get(phone);
  if (!entry || now > entry.resetAt) {
    smsAttempts.set(phone, { count: 1, resetAt: now + SMS_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > SMS_LIMIT;
}

export async function POST(request: NextRequest) {
  const { phone } = await request.json();

  if (!phone || typeof phone !== "string") {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 }
    );
  }

  // Normalize: strip non-digits, ensure +1 prefix for US numbers
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

  if (e164.length !== 12) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit US phone number" },
      { status: 400 }
    );
  }

  if (isRateLimited(e164)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: e164,
        channel: "sms",
      });

    return NextResponse.json({ success: true, phone: e164 });
  } catch (err) {
    console.error("Twilio send error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Try again." },
      { status: 500 }
    );
  }
}
