# Local test kit — fix/lane2-f1-f2-anon-select

Test the anon-SELECT fix on your Mac against a throwaway local Supabase.
Production is never contacted for writes; all data is fake.

## 0. Prerequisites
- Docker Desktop running
- Supabase CLI (`brew install supabase/tap/supabase`)
- This branch checked out: `fix/lane2-f1-f2-anon-select`

## 1. Start local Supabase
From the repo root:
```bash
supabase init   # only if supabase/config.toml does not exist yet
supabase start
```
Note the `API URL` (default http://127.0.0.1:54321) and the `anon key`
from the output. Local Studio (SQL Editor) is at http://127.0.0.1:54323.

## 2. Build the prod-like database
Paste each file into the local Studio SQL Editor, in this exact order:

1. `supabase/schema.sql` — tables, RLS, join_queue RPC
   (already includes the phone + staff_pin_hash columns, so do NOT
   run `add-phone-column.sql` or `add-pin-hash.sql` — they would fail
   on duplicate columns)
2. `supabase/add-price.sql`
3. `supabase/update-prices-durations.sql`
4. `supabase/add-rate-limit.sql` — adds the contradictory open
   "Service role manages pin_attempts" policy, as in the repo history
5. `supabase/add-sms-rate-limit.sql` — same for sms_attempts
6. `supabase/seed.sql` — services, barbers, one closed shop row
7. `supabase/test-kit/00-prod-like-grants.sql` — grants anon the
   table-level SELECT it holds in prod (the exposure precondition)
8. `supabase/test-kit/01-fake-seed.sql` — fake PIN hash, fake queue
   phones (555 numbers), fake rate-limit rows; opens the shop

Do NOT run `harden-rls.sql` / `lockdown-rls.sql` in this sequence —
the point is to start from the exposed state.

## 3. Pre-fix checks — the exposure must reproduce
```bash
export ANON_KEY=<anon key from supabase status>
cd supabase/test-kit
./run-checks.sh pre
```
Expect: all 7 checks PASS — sensitive reads return 200 (exposure
reproduced locally), and the app's two real queries return 200.

## 4. Apply the fix — twice
Paste `supabase/fix-anon-select-exposure.sql` into the local SQL
Editor and run it. Then run it a **second time** — the second run
must complete with no errors (idempotency proof on a real database,
not just on paper).

## 5. Post-fix checks — closure, tightened criteria
```bash
./run-checks.sh post
```
Expect: all 7 checks PASS —
- the 5 sensitive reads are denied with Postgres code **42501**
  specifically (a bare non-200 does not count), and
- the app's exact settings + queue queries still return **200**
  with the same key in the same run.

## 6. App smoke test (incl. Realtime)
Point the app at local and run it:
```bash
# .env.local → NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#              NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
#              (plus a local SUPABASE_SERVICE_ROLE_KEY from supabase status)
npm run dev
```
Check: landing page loads, /join completes end-to-end, staff login
works, and the public display in a second tab updates **live** when
a queue entry changes — test both an already-open tab and a freshly
opened one, and confirm no phone/hash appears in Realtime payloads
(DevTools → Network → WS). Live updates are the one behavior the
checker could only pass by design; this is where it is proven.

## What this proves / does not prove
Proves: migration logic — grants, policy consolidation, idempotency,
app-query compatibility, Realtime under column-only grants.
Does NOT prove: prod drift. Prod is built from partially recovered
source; if prod's live shop_settings select differs from the repo,
local passes and prod could still break. That is why the pre-apply
inventory queries on prod stay in the runbook
(`workspace/goals/chop-shop-queue-system-audit/files/fix-lane2-f1-f2-branch-notes.md`)
either way.
