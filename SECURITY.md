# Security Guide -- PXL Vision Studio

Security reference for the Chop Shop Walk-in Queue Manager.
Maintained by PXL Vision Studio.

---

## Table of Contents

1. [CVE-2025-29927: Next.js Middleware Bypass](#cve-2025-29927-nextjs-middleware-bypass)
2. [Pre-Deploy Security Checklist](#pre-deploy-security-checklist)
3. [Session Security](#session-security)
4. [Rate Limiting](#rate-limiting)
5. [Database and RLS Security](#database-and-rls-security)
6. [Input Validation](#input-validation)
7. [Common Vibe Coding Security Mistakes](#common-vibe-coding-security-mistakes)
8. [Dependency Security](#dependency-security)
9. [Deployment and Vercel Security](#deployment-and-vercel-security)
10. [Security Audit Command for Claude Code](#security-audit-command-for-claude-code)

---

## CVE-2025-29927: Next.js Middleware Bypass

**CVE-2025-29927** allows attackers to bypass Next.js middleware by sending a crafted `x-middleware-subrequest` header, causing the middleware stack to be skipped entirely. This affects any application that relies on `middleware.ts` for authentication or authorization checks.

### Why This Project Is Not Affected

This project does **not** use a `middleware.ts` file. There is no middleware-based auth gate in the codebase. Instead, authentication is enforced inline within each API route handler:

- **Staff API routes** (`/api/staff`, `/api/change-pin`) call `verifyStaffRequest()` at the top of the handler, which reads and validates the `staff_session` HTTP-only cookie directly from the incoming `NextRequest`. This check cannot be bypassed by manipulating middleware headers because it never passes through the middleware pipeline.
- **Cron endpoint** (`/api/cleanup`) validates a `Bearer` token from the `Authorization` header against the `CRON_SECRET` environment variable.
- **PIN verification** (`/api/verify-pin`) is a public endpoint by design, protected by rate limiting rather than session auth.
- **SMS verification** (`/api/send-code`, `/api/verify-code`) is public by design, protected by per-phone rate limiting.

### Defensive Recommendation

Even though the project is not vulnerable, keep Next.js updated to a patched version (>=14.2.25, >=15.2.3) as a defense-in-depth measure. If middleware is ever added in the future, ensure it does not serve as the sole authentication layer -- always verify credentials inline in the route handler.

---

## Pre-Deploy Security Checklist

This checklist is specific to the PIN-based auth model used by this project. Run through it before every production deployment.

### Environment Variables

- [ ] `SESSION_SECRET` is set and is a cryptographically random string (minimum 32 bytes / 64 hex chars). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `STAFF_PIN` is set for initial PIN seeding (only used on first login before hash is stored in DB)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set and is NOT prefixed with `NEXT_PUBLIC_`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and `TWILIO_PHONE_NUMBER` are set
- [ ] `CRON_SECRET` is set for the cleanup cron endpoint
- [ ] No secrets appear in client-side code (search for `SUPABASE_SERVICE_ROLE_KEY` and `TWILIO_AUTH_TOKEN` in `src/` -- they must only appear in files under `src/app/api/` or `src/lib/supabase/server.ts`)

### Authentication

- [ ] `staff_pin_hash` exists in the `shop_settings` row (PIN has been hashed to DB, not relying on env var fallback)
- [ ] Staff session cookie is set with `httpOnly: true`, `secure: true`, `sameSite: "strict"`, and an 8-hour `maxAge`
- [ ] `verifyStaffRequest()` is called at the top of every staff-only API route before any data access
- [ ] PIN comparison uses `timingSafeEqual` (verified in `src/lib/pin-hash.ts`)

### Headers and CSP

- [ ] `Content-Security-Policy` is configured in `next.config.ts` with `frame-ancestors 'none'`
- [ ] `X-Frame-Options: DENY` is set
- [ ] `X-Content-Type-Options: nosniff` is set
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` is set
- [ ] `Permissions-Policy` blocks camera, microphone, and geolocation

### Database

- [ ] RLS is enabled on all tables (`services`, `barbers`, `shop_settings`, `queue_entries`, `cut_history`)
- [ ] Anon key policies are SELECT-only on all tables
- [ ] `join_queue()` function is `SECURITY DEFINER` with proper cap and open-status checks
- [ ] `pin_attempts` and `sms_attempts` tables exist for rate limiting

---

## Session Security

This project uses a custom HMAC-based session token instead of Supabase Auth or JWTs.

### How It Works

1. **PIN Verification** -- Staff submits a PIN via `/api/verify-pin`. The PIN is compared against the salted HMAC-SHA256 hash stored in `shop_settings.staff_pin_hash` using `timingSafeEqual`.

2. **Token Creation** -- On successful PIN verification, `createSessionToken()` generates a 32-byte random token and signs it with HMAC-SHA256 using the `SESSION_SECRET` environment variable. The format is `{random_hex}.{signature_hex}`.

3. **Cookie Storage** -- The token is stored in an HTTP-only cookie with these flags:
   - `httpOnly: true` -- inaccessible to JavaScript
   - `secure: true` -- HTTPS only (in production)
   - `sameSite: "strict"` -- no cross-site requests
   - `path: "/"` -- available to all routes
   - `maxAge: 28800` -- 8-hour TTL

4. **Token Verification** -- On each staff API request, `verifyStaffRequest()` reads the cookie, splits the token at the `.` delimiter, recomputes the HMAC signature, and compares using `timingSafeEqual`.

### PIN Hashing

PINs are stored in `salt:hash` format where:
- `salt` is 16 random bytes (hex-encoded)
- `hash` is `HMAC-SHA256(salt, pin)` (hex-encoded)

Legacy unsalted SHA-256 hashes (no colon separator) are supported for backward compatibility but new PINs always use the salted HMAC format.

### Security Properties

- **No timing side-channels** -- All comparisons use `timingSafeEqual`
- **No replay across environments** -- Tokens are bound to the `SESSION_SECRET`; rotating the secret invalidates all sessions
- **No session fixation** -- Tokens are generated server-side with `randomBytes(32)`
- **No XSS token theft** -- HTTP-only cookies are inaccessible to client-side JavaScript
- **No CSRF** -- `sameSite: "strict"` prevents cross-origin cookie sending; staff actions use POST with JSON bodies

---

## Rate Limiting

### PIN Attempts

| Parameter      | Value                                |
|----------------|--------------------------------------|
| Max attempts   | 10 per window                        |
| Window         | 15 minutes                           |
| Key            | Client IP (`x-forwarded-for`)        |
| Storage        | `pin_attempts` table (Supabase)      |
| Reset          | Cleared on successful authentication |

Implementation: `src/app/api/verify-pin/route.ts`

### SMS Verification Attempts

| Parameter      | Value                                |
|----------------|--------------------------------------|
| Max attempts   | 3 per window                         |
| Window         | 15 minutes                           |
| Key            | Phone number (E.164 format)          |
| Storage        | `sms_attempts` table (Supabase)      |

Implementation: `src/app/api/send-code/route.ts`

### Important Notes

- Rate limit state is stored in the database, not in memory, so it persists across serverless function invocations and Vercel edge restarts.
- The IP is extracted from `x-forwarded-for` (set by Vercel's reverse proxy). On Vercel, this header is trustworthy. If self-hosting behind a different proxy, verify that this header cannot be spoofed.
- Twilio Verify has its own built-in rate limiting in addition to the application-level SMS rate limit.

---

## Database and RLS Security

### RLS Policy Summary

All tables have RLS enabled. The anon key (used by the browser client) can only SELECT:

| Table            | Anon SELECT | Anon INSERT/UPDATE/DELETE |
|------------------|-------------|---------------------------|
| `services`       | Yes         | No                        |
| `barbers`        | Yes         | No                        |
| `shop_settings`  | Yes         | No                        |
| `queue_entries`  | Yes         | No                        |
| `cut_history`    | Yes         | No                        |
| `pin_attempts`   | No          | No (service role only)    |
| `sms_attempts`   | No          | No (service role only)    |

All mutations are performed either through:
- The `join_queue()` SECURITY DEFINER function (customer joins), or
- The service role key in API routes (staff actions)

### The `join_queue()` Function

This PL/pgSQL function runs as `SECURITY DEFINER`, meaning it executes with the privileges of the function owner (typically `postgres`), not the calling user. This is necessary because the anon key cannot INSERT into `queue_entries` directly.

The function enforces two critical invariants atomically:
1. **Shop must be open** -- checks `shop_settings.is_open`
2. **Queue must not be full** -- counts active entries against `shop_settings.queue_cap`

Because these checks and the INSERT happen within a single function call, there is no TOCTOU race condition.

### Service Role Key Isolation

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. It is confined to `src/lib/supabase/server.ts` and is only called from `src/app/api/` route handlers. The `createServiceClient()` function is never imported or called from client components.

The key is accessed via `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix), which means Next.js will not bundle it into client-side JavaScript.

### Data Exposure Considerations

- `shop_settings.staff_pin_hash` is readable via the anon key's SELECT policy. While the hash is salted and HMAC-signed, consider adding a column-level security policy or a view that excludes this column from public reads.
- `queue_entries.phone` is readable via SELECT. If phone number privacy is a concern, consider restricting this column similarly.

---

## Input Validation

All API endpoints validate input with Zod 4 schemas before processing. Invalid input is rejected with a 400 status code and a generic error message.

### Staff Action Schema (Discriminated Union)

The `/api/staff` endpoint uses a discriminated union on the `action` field:

```typescript
const CallSchema = z.object({
  action: z.literal("call"),
  entryId: z.string().uuid(),
});

const CompleteSchema = z.object({
  action: z.literal("complete"),
  entryId: z.string().uuid(),
  barberId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  serviceId: z.string().uuid(),
  source: z.string().min(1).max(20),
  calledAt: z.string().nullable(),
});

const ToggleShopSchema = z.object({
  action: z.literal("toggle-shop"),
  settingsId: z.string().uuid(),
  isOpen: z.boolean(),
});

const SetQueueCapSchema = z.object({
  action: z.literal("set-queue-cap"),
  settingsId: z.string().uuid(),
  cap: z.number().int().min(1).max(30),
});

const StaffActionSchema = z.discriminatedUnion("action", [
  CallSchema,
  CompleteSchema,
  // ... other action schemas
]);
```

### PIN Verification Schema

```typescript
const PinSchema = z.object({
  pin: z.string().min(1).max(20),
});
```

### SMS Verification Schema

```typescript
const SendCodeSchema = z.object({
  phone: z.string().min(1).max(20),
});
```

### Client-Side Sanitization

Customer names are sanitized in `src/lib/queue-actions.ts` before being sent to the database:

```typescript
const safeName = customerName.trim().slice(0, 50).replace(/<[^>]*>/g, "");
```

This strips HTML tags, trims whitespace, and enforces a 50-character limit.

### Error Response Pattern

API routes return generic error messages to clients and log sanitized details server-side:

```typescript
function dbErr(action: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[staff/${action}] DB error: ${msg}`);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
```

This prevents leaking database error details, table names, or query structures to the client.

---

## Common Vibe Coding Security Mistakes

These are mistakes frequently introduced when building quickly with AI-assisted tools. Each row notes whether this project is currently safe.

| Mistake | Description | Status in This Project |
|---------|-------------|----------------------|
| Exposing service role key | Using `NEXT_PUBLIC_` prefix on the Supabase service role key, or importing `server.ts` in a client component | SAFE -- key is in `process.env.SUPABASE_SERVICE_ROLE_KEY`, `createServiceClient()` only used in API routes |
| No input validation | Trusting `request.json()` output directly without schema validation | SAFE -- all endpoints use Zod schemas with `safeParse` |
| Auth in middleware only | Relying solely on `middleware.ts` for auth, which can be bypassed (CVE-2025-29927) | SAFE -- no middleware; auth is inline via `verifyStaffRequest()` |
| Leaking error details | Returning raw database errors or stack traces to the client | SAFE -- `dbErr()` returns generic messages, logs details server-side |
| Missing RLS | Forgetting to enable RLS, giving the anon key full read/write access | SAFE -- RLS enabled on all five tables, anon key is SELECT-only |
| Timing attacks on auth | Using `===` to compare hashes or tokens, leaking timing information | SAFE -- all comparisons use `crypto.timingSafeEqual` |
| Hardcoded secrets | Storing API keys or PINs directly in source code | SAFE -- all secrets in environment variables, PIN hashed to DB |
| Missing rate limiting | No throttle on authentication endpoints, enabling brute force | SAFE -- PIN (10/15min) and SMS (3/15min) rate limits enforced |
| CSRF on state-changing endpoints | Using GET for mutations, or not validating origin on POST | SAFE -- all mutations are POST, cookies are `sameSite: "strict"` |
| Unsanitized user input in HTML | Rendering user-provided strings without escaping | SAFE -- React escapes by default; names are additionally tag-stripped |
| No CSP headers | Missing Content-Security-Policy, enabling XSS payloads | SAFE -- CSP configured in `next.config.ts` with restricted directives |
| Using `eval()` or `dangerouslySetInnerHTML` | Executing or rendering untrusted strings | SAFE -- neither is used in the codebase |
| Cron endpoint without auth | Public cron endpoints that anyone can trigger | SAFE -- `/api/cleanup` validates `CRON_SECRET` bearer token |

---

## Dependency Security

### Auditing Dependencies

Run the npm audit command regularly to check for known vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# View detailed report
npm audit --json

# Attempt automatic fixes (non-breaking)
npm audit fix

# Force fix (may include breaking changes -- review carefully)
npm audit fix --force
```

### Update Strategy

```bash
# Check for outdated packages
npm outdated

# Update all packages within semver ranges
npm update

# Update a specific package to latest
npm install <package>@latest
```

### Key Packages to Monitor

These packages handle security-critical functionality and should be updated promptly when security patches are released:

| Package | Role | Why It Matters |
|---------|------|----------------|
| `next` | Framework | Middleware bypasses, SSRF, header injection |
| `@supabase/supabase-js` | Database client | Auth bypasses, query injection |
| `twilio` | SMS provider | Credential handling, API security |
| `zod` | Input validation | Schema bypass vulnerabilities |

### Lockfile Hygiene

- Always commit `package-lock.json` to version control
- Never modify `package-lock.json` by hand
- Run `npm ci` (not `npm install`) in CI/CD pipelines to ensure deterministic builds

---

## Deployment and Vercel Security

### Environment Variables on Vercel

- Set all secrets in Vercel's Environment Variables UI (Settings > Environment Variables), not in `vercel.json`
- Use separate values for Preview and Production environments
- The `SESSION_SECRET` should differ between preview and production to prevent session tokens from one environment being valid in another

### Vercel Cron Security

The cleanup cron job is defined in `vercel.json` and hits `/api/cleanup`. Vercel automatically sends the `CRON_SECRET` as a bearer token in the `Authorization` header. The endpoint validates this token:

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Ensure `CRON_SECRET` is set in Vercel environment variables. Without it, the cron endpoint will reject all requests (including Vercel's own cron invocations).

### Headers Configuration

Security headers are configured in `next.config.ts` via the `headers()` function and apply to all routes (`/(.*)`). These are enforced at the Vercel edge layer and cannot be stripped by client-side code.

### Preview Deployments

- Preview deployments use the same codebase but may have different environment variables
- Ensure preview deployments are not indexed by search engines (Vercel handles this with `X-Robots-Tag: noindex` by default)
- If the staff PIN is the same across preview and production, be aware that anyone with access to preview URLs can test PINs

### Domain and HTTPS

- Vercel enforces HTTPS by default on all deployments
- The `secure` flag on the session cookie ensures it is only sent over HTTPS in production
- The CSP includes `upgrade-insecure-requests` to force HTTPS for all subresources

---

## Security Audit Command for Claude Code

Use the following prompt with Claude Code to run a security audit of the codebase:

```
Review this codebase for security vulnerabilities. Check the following:

1. Grep for any use of SUPABASE_SERVICE_ROLE_KEY outside of src/lib/supabase/server.ts and src/app/api/ directories
2. Grep for any use of NEXT_PUBLIC_ prefix on secret environment variables (SERVICE_ROLE_KEY, TWILIO_AUTH_TOKEN, SESSION_SECRET, STAFF_PIN, CRON_SECRET)
3. Verify that every POST handler in src/app/api/staff/ calls verifyStaffRequest() before accessing data
4. Check that all Zod schemas use safeParse (not parse) to avoid throwing unhandled exceptions
5. Grep for dangerouslySetInnerHTML usage
6. Grep for eval() or Function() constructor usage
7. Verify that timingSafeEqual is used for all hash/token comparisons in src/lib/pin-hash.ts
8. Check that the session cookie sets httpOnly, secure, and sameSite flags
9. Verify that error responses do not leak internal details (no raw error.message in JSON responses to clients)
10. Run: npm audit
11. Check that next.config.ts includes CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers
12. Verify that RLS is enabled on all tables in supabase/schema.sql
13. Check that join_queue() is SECURITY DEFINER and validates shop open status and queue cap
14. Verify the cleanup cron endpoint checks CRON_SECRET

Report any findings with file paths and line numbers.
```

---

*PXL Vision Studio -- Security documentation for the Chop Shop Walk-in Queue Manager*
