import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/app/api/verify-pin/route";

// Verifies staff session cookie and returns parsed body
export async function verifyStaffRequest(
  request: NextRequest
): Promise<{ error?: NextResponse; body?: Record<string, unknown> }> {
  // Check HTTP-only session cookie
  const token = request.cookies.get("staff_session")?.value;

  if (!token || !verifySessionToken(token)) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated. Please log in again." },
        { status: 401 }
      ),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      ),
    };
  }

  return { body };
}
