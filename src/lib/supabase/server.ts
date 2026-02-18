import { createClient } from "@supabase/supabase-js";

// Server-side client using the service role key — bypasses RLS.
// ONLY use this in API routes / server components, NEVER expose to the client.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
