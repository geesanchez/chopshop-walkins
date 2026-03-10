import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";

const VerifyCodeSchema = z.object({
  phone: z.string().min(1).max(20),
  code: z.string().min(4).max(10),
});

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

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: parsed.data.phone,
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
