# Demo Runbook

Use this runbook for the final implementation video, class demo, and fallback live walkthroughs.

## Pre-Demo Checklist

- Verify `.env.local` contains the correct Clerk publishable key
- Verify backend `.env` contains a working MongoDB connection string
- Start frontend and backend successfully
- Run `npm run seed:demo` and confirm the 13 live listings, 14 offers, and 7 conversation threads appear
- Confirm all demo accounts can sign in

## Required Demo Roles

- Presenter seller account
- Community buyers for inbound offer demos
- Presenter buyer mode for outbound offer demos

## Recommended Demo Flow

1. Show the public landing page and marketplace feed
2. Call out visible listing statuses in the feed: active, reserved, and sold
3. Open a public item detail page and explain the seller trust snapshot
4. Sign in as a buyer and submit a structured offer with price, meetup window, and payment method
5. Switch to the seller and review grouped offers in the offers inbox
6. Accept an offer and show the listing moving into a reserved state
7. Open the linked conversation to show people-first messaging with item context
8. Revisit the seller profile to show banner, connectors, overall rating, and percent-based trust metrics
9. If time allows, show the owner profile editor updating public-facing trust context

## Seeded Demo Scenarios

- `Desk Lamp` stays `active` and has 3 inbound `pending` offers from different buyers
- `Mini Fridge` is already `reserved` with 1 `accepted` offer, 1 `declined` offer, and a ready-to-open thread from `/offers`
- Community listings cover all 8 categories and include additional `active`, `reserved`, and `sold` states in the public feed
- The presenter also has outbound offers on community listings so buyer mode is populated
- `/messages` opens into 8 believable conversation threads spread across the last 2 days
- Safe reseeding is tag-based by default, so unrelated real data stays intact unless you opt into a full reset
- The demo script can attach the presenter profile to a real Clerk user with email lookup:

  ```bash
  DEMO_USER_EMAIL=you@ufl.edu CLERK_SECRET_KEY=sk_test_... npm run seed:demo
  ```

  Or use a direct Clerk user ID:

  ```bash
  DEMO_USER_ID=your_clerk_user_id npm run seed:demo
  ```

  If you need a destructive reset first:

  ```bash
  SEED_FULL_RESET=true npm run seed:demo
  ```

  Optional deterministic refresh controls:
  - `FAKER_SEED=20260401` keeps filler bios, offer notes, and message variations deterministic
  - `SEED_TAG=custom-demo-tag` changes the namespace used for safe tag-only cleanup

## Video Capture Notes

- Keep one listing in `reserved` state and one in `sold` state for feed examples
- Keep one active listing with a pending offer so the seller inbox feels populated
- Keep the buyer inbox visible too, since the presenter now has outbound offers ready to show
- Avoid live setup or account repair during the video unless the step is central to the story

## Fallback Plan

If one part of the live flow breaks:

- Fall back to the seeded data path rather than debugging on camera
- Skip nonessential profile-editing details before skipping trust, offer, or messaging flows
- If offer submission is unstable, pivot to the pre-seeded reserved and pending examples rather than live creation
- Treat transactions, escrow, and post-meetup review flows as storyboarded future work unless they are fully stable locally

## Manual Smoke Test Before Recording

- Public browse works
- Sign-in works
- Create listing works
- Public feed shows 12 varied listings with multiple statuses
- Item detail page loads
- Offer creation works
- Seller inbox shows multiple inbound offers
- Buyer inbox is not empty
- Reserved and sold badges appear in the public feed
- Messaging inbox shows multiple believable threads and the thread view opens with listing context
- Trust metrics render on the profile
- Presenter profile uses the expected Clerk identity when `DEMO_USER_EMAIL` is used
- Profile editing saves public trust fields for the signed-in owner
