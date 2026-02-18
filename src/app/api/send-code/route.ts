import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
