# RULES.md — PXL Vision Studio

Engineering rules for the Chop Shop Walk-in Queue Manager.
Stack: Next.js 16 (App Router) + Supabase + Tailwind CSS v4 + Twilio Verify + Vercel.

---

## 1. NEVER DO THESE (Security)

| #  | Rule |
|----|------|
| S1 | Never expose the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) in client-side code. It must only be imported in `src/lib/supabase/server.ts` and used within API routes. |
| S2 | Never create database tables without enabling Row Level Security (RLS). The service role key bypasses RLS by design — that is the only sanctioned escape hatch. |
| S3 | Never store session tokens, PINs, or secrets in `localStorage` or `sessionStorage`. Authentication state is managed exclusively through HTTP-only cookies (`staff_session`). |
| S4 | Never use `dangerouslySetInnerHTML` with user-supplied content without prior sanitization. |
| S5 | Never concatenate user input into SQL strings. Always use parameterized queries or Supabase's query builder. |
| S6 | Never skip Zod validation on API route inputs. Every `POST` body and query parameter must be validated with a Zod 4 schema before use. |
| S7 | Never hardcode API keys, tokens, PINs, or passwords in source code. All secrets belong in `.env.local` (local) or Vercel environment variables (production). |
| S8 | Never deploy without running `npm run build` and `npm run lint` first. A clean build and lint pass are mandatory. |
| S9 | Never bypass `staff_session` cookie verification on staff-protected API endpoints. Every staff action must go through session validation (`src/lib/staff-auth.ts`). |
| S10 | Never expose `SESSION_SECRET` or `CRON_SECRET` as `NEXT_PUBLIC_` environment variables. The `NEXT_PUBLIC_` prefix makes values available in the browser bundle. |

---

## 2. ALWAYS DO THESE (Security)

| #  | Rule |
|----|------|
| S11 | Always verify the `staff_session` cookie in every protected API route using the helper in `src/lib/staff-auth.ts`. |
| S12 | Always use `crypto.timingSafeEqual` for comparing secrets, hashes, and session tokens to prevent timing attacks. |
| S13 | Always configure security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) in `next.config.ts`. |
| S14 | Always confirm that `.env.local` is listed in `.gitignore`. Never commit environment files containing secrets. |
| S15 | Always rate-limit authentication endpoints (`/api/verify-pin`, `/api/send-code`, `/api/verify-code`). The PIN endpoint enforces 10 attempts per 15 minutes via the `pin_attempts` table. |

---

## 3. NEVER DO THESE (Code Quality)

| #  | Rule |
|----|------|
| C1 | Never use the `any` type. Use `unknown` and narrow with type guards, or define a proper interface. |
| C2 | Never disable TypeScript strict mode. The project has `strict: true` in `tsconfig.json` — it stays on. |
| C3 | Never use `@ts-ignore` or `@ts-nocheck`. Fix the underlying type error instead. |
| C4 | Never leave `console.log` in production code. Use `console.error` only for actual errors that need visibility in server logs. |
| C5 | Never use `var`. Use `const` by default; use `let` only when reassignment is necessary. |

---

## 4. ALWAYS DO THESE (Code Quality)

| #  | Rule |
|----|------|
| C6 | Always use absolute imports with the `@/` path alias (maps to `./src/*`). No relative imports that climb more than one level (`../../`). |
| C7 | Always add error handling on async operations — `try/catch` in API routes, `.catch()` or error boundaries in client code. |
| C8 | Always define TypeScript `interface` or `type` declarations for component props, API payloads, and database row shapes. |
| C9 | Always keep components focused on a single responsibility. Extract reusable logic into custom hooks (`src/hooks/`) or utility functions (`src/lib/`). |
| C10 | Always put shared business logic in `src/lib/`. Components should import logic, not define it inline. |

---

## 5. File Placement Rules

| What you are adding | Where it goes |
|---------------------|---------------|
| New page route | `src/app/{route}/page.tsx` (server component) |
| Client component for a route | `src/app/{route}/{route}-client.tsx` (with `"use client"` directive) |
| API route | `src/app/api/{endpoint}/route.ts` |
| Reusable UI component (shadcn/ui) | `src/components/ui/{component}.tsx` |
| App-specific component | `src/components/{component-name}.tsx` |
| Custom React hook | `src/hooks/{use-hook-name}.ts` |
| Shared business logic / utilities | `src/lib/{module-name}.ts` |
| Supabase client (browser) | `src/lib/supabase/client.ts` |
| Supabase client (server / service role) | `src/lib/supabase/server.ts` |
| Static config (shop info, constants) | `src/lib/shop-config.ts` |
| Database schema / migrations | `supabase/schema.sql` |
| Global styles | `src/app/globals.css` |
| Public assets (images, icons) | `public/` |
| Environment variables | `.env.local` (never committed) |

---

## 6. Pre-Commit Checklist

Run these commands before every commit. All must pass.

```bash
# 1. Type-check and build
npm run build

# 2. Lint
npm run lint

# 3. Verify no secrets are staged
git diff --cached --name-only | grep -E '\.env' && echo "STOP: env file staged" || echo "OK"

# 4. Verify no console.log statements are staged
git diff --cached -S 'console.log' --name-only | grep -E '\.(ts|tsx)$' && echo "WARNING: console.log found in staged files" || echo "OK"
```

Note: No test framework is currently configured. When one is added, running tests must become a mandatory step in this checklist.

---

*PXL Vision Studio — Engineering Standards*
