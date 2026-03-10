import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPin, verifyPin } from "@/lib/pin-hash";
import { verifyStaffRequest } from "@/lib/staff-auth";

export async function POST(request: NextRequest) {
  const { error: authError, body } = await verifyStaffRequest(request);
  if (authError) return authError;

  const { currentPin, newPin } = body as { currentPin: string; newPin: string };

  if (!currentPin || !newPin || typeof currentPin !== "string" || typeof newPin !== "string") {
    return NextResponse.json({ error: "Current and new PIN required" }, { status: 400 });
  }

  if (newPin.length < 4) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Failed to update PIN" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
