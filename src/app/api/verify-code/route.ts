import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json(
      { error: "Phone and code required" },
      { status: 400 }
    );
  }

  try {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (check.status === "approved") {
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json(
      { error: "Invalid code. Try again." },
      { status: 401 }
    );
  } catch (err) {
    console.error("Twilio verify error:", err);
    return NextResponse.json(
      { error: "Verification failed. Request a new code." },
      { status: 500 }
    );
  }
}
