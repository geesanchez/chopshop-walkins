# The Chop Shop — Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **New Project**
3. Name it `chop-shop-walkins`
4. Set a strong database password (save it somewhere safe)
5. Choose the region closest to Watsonville, CA → **West US (North California)**
6. Click **Create new project** and wait ~2 minutes for it to spin up

## 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings → API**
2. Copy **Project URL** (looks like `https://abcdefg.supabase.co`)
3. Copy **anon public** key (the long JWT string under "Project API keys")

## 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Then fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
STAFF_PIN=1234
```

**Change `STAFF_PIN`** to whatever PIN the shop wants to use for staff access.

## 4. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/schema.sql` and paste it in
4. Click **Run** — you should see "Success. No rows returned"
5. Create another new query
6. Copy the contents of `supabase/seed.sql` and paste it in
7. **IMPORTANT:** Edit the barber names to match your actual barbers:
   ```sql
   insert into public.barbers (name) values
     ('Carlos'),
     ('Mike'),
     ('Jesse');
   ```
8. Click **Run**

## 5. Enable Realtime

The schema.sql already adds tables to the realtime publication, but verify it:

1. Go to **Database → Replication** in your Supabase dashboard
2. Under "supabase_realtime", confirm `queue_entries` and `shop_settings` are listed
3. If not, click the publication and toggle them on

## 6. Run the App

```bash
npm run dev
```

Visit:
- `http://localhost:3000` — Home / navigation
- `http://localhost:3000/staff` — Staff dashboard (enter your PIN)
- `http://localhost:3000/kiosk` — Customer kiosk (coming next)
- `http://localhost:3000/display` — TV display (coming soon)
- `http://localhost:3000/join` — Remote join (coming soon)

## 7. Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `STAFF_PIN`
4. Deploy

## Reference: Shop Hours (for display purposes)

| Day       | Hours      |
|-----------|------------|
| Tuesday   | 10 AM – 6 PM |
| Wednesday | 10 AM – 6 PM |
| Thursday  | 10 AM – 6 PM |
| Friday    | 10 AM – 6 PM |
| Saturday  | 10 AM – 3 PM |
| Sunday    | Closed     |
| Monday    | Closed     |

Open/closed is **manually toggled** by staff — not automatic.
