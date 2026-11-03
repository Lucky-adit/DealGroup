# DealGroup

> Mobile apps (iPhone + Android) live in [`mobile/`](mobile/README.md) and share `lib/` with this website.

Group-buying platform: neighbours pledge to buy the same product, then verified sellers bid for the whole group.
MVP: rooftop solar for housing societies in Ahmedabad. Responsive on phones, tablets and desktop. English and Hindi.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys the app runs in **demo mode**: in-memory example data (reset on restart), and the sign-in page lets you pick
buyer, seller or admin. No money is collected in either mode yet.

## Go live with Supabase

1. Create a Supabase project. In **Authentication → Providers → Phone**, enable phone sign-in with an SMS provider.
2. Run `supabase/migrations/0001_init.sql`, then optionally `supabase/seed.sql`, in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Sign in once with your phone, then make yourself admin:
   `update public.profiles set role = 'admin' where phone = '91XXXXXXXXXX';`

## What's built (PRD P0 + P1)

| Area | Where |
| --- | --- |
| Deal list, category filter, price ladder, live progress | `app/page.tsx`, `app/deals/[id]` |
| Pledge with refundable deposit (mock), change or leave | `app/deals/[id]`, `lib/actions.ts` |
| Share link + WhatsApp for society organisers | `components/ShareButton.tsx` |
| Phone OTP sign-in (Supabase) / demo roles | `app/login` |
| Seller registration, sealed bids, verification badge | `app/seller`, `app/admin` |
| Admin: create deals, verify sellers, lock best verified bid | `app/admin` |
| Buyer accepts or declines the locked price (72-hour window is policy; not yet enforced by a timer) | `app/deals/[id]` |
| Request a deal | `app/requests` |
| Install tracking (survey → installed → net meter → subsidy filed → complete) | `app/me`, `app/seller`, `app/admin` |
| Buyer confirms install; ratings and reviews | `app/me` |

Access rules live in the database (`supabase/migrations/0001_init.sql`): pledge details are visible only to the buyer, admins and
(after acceptance) the winning seller; bids are sealed; only admins can verify sellers or lock deals.

## Not built yet

- Real payments: deposits need an RBI-authorised payment partner with escrow. Today they are status fields only.
- Auto-expiry jobs (refund on deadline, 72-hour accept window), SMS/WhatsApp notifications, Gujarati.
- Legal review: refund policy, consent and DPDP Act compliance.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
