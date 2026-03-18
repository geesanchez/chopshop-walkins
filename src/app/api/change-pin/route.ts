import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPin, verifyPin } from "@/lib/pin-hash";
import { verifyStaffRequest } from "@/lib/staff-auth";

const ChangePinSchema = z.object({
  currentPin: z.string().min(1).max(20),
  newPin: z.string().min(4).max(20),
});

export async function POST(request: NextRequest) {
  const { error: authError, body } = await verifyStaffRequest(request);
  if (authError) return authError;

  const parsed = ChangePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Current and new PIN required (min 4 digits)" }, { status: 400 });
  }

  const { currentPin, newPin } = parsed.data;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("shop_settings")
    .select("staff_pin_hash")
    .limit(1)
    .single();

  // Verify current PIN
  let currentValid = false;
  if (data?.staff_pin_hash) {
    currentValid = verifyPin(currentPin, data.staff_pin_hash);
  } else {
    currentValid = currentPin === process.env.STAFF_PIN;
  }

  if (!currentValid) {
    return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
  }

  // Store new PIN hash
  const { error } = await supabase
    .from("shop_settings")
    .update({ staff_pin_hash: hashPin(newPin) })
    .not("id", "is", null);

  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[change-pin] DB error: ${msg}`);
    return NextResponse.json({ error: "Failed to update PIN" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
