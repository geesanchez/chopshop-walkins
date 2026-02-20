# The Chop Shop — Walk-in Queue Manager

A real-time walk-in queue management system for The Chop Shop barbershop in Watsonville, CA. Customers can join the queue in-store via a kiosk or remotely from their phone, and barbers manage the queue from a staff dashboard.

**Live:** [thechopshopwatsonville.com](https://thechopshopwatsonville.com)

## Features

- **Kiosk Mode** (`/kiosk`) — In-store iPad/tablet for walk-in customers to join the queue. Protected by a staff PIN.
- **Remote Join** (`/join`) — Customers join the queue from their phone with SMS verification to prevent spam.
- **Staff Dashboard** (`/staff`) — Barbers manage the queue: call next customer, skip, remove, and adjust active barber count.
- **Public Display** (`/display`) — TV/monitor view showing the live queue with estimated wait times.
- **Book Appointment** — Link to Booksy for customers who prefer to schedule ahead.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database & Realtime:** Supabase (PostgreSQL + Realtime subscriptions)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **SMS Verification:** Twilio Verify API
- **Hosting:** Vercel
- **Domain:** Namecheap

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Twilio account (for SMS verification)

### Installation

```bash
git clone https://github.com/geesanchez/chopshop-walkins.git
cd chopshop-walkins
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STAFF_PIN=your_staff_pin
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

Run the SQL migrations in the Supabase SQL Editor (in order):

1. `supabase/` — Schema setup scripts for `queue_entries`, `services`, and `shop_settings` tables
2. `supabase/update-prices-durations.sql` — Sets current service prices and durations

### Deployment

```bash
npx vercel --prod
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with links to join queue or book appointment |
| `/kiosk` | In-store kiosk (PIN protected) |
| `/join` | Remote queue join (SMS verified) |
| `/staff` | Staff dashboard (PIN protected) |
| `/display` | Public queue display for TV/monitor |

## Services & Pricing

| Service | Price | Duration |
|---------|-------|----------|
| Haircut | $35 | 45 min |
| Kids Cut | $35 | 45 min |
| Haircut + Beard | $45 | 60 min |

## License

Private — All rights reserved.
