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
8. In `/messages`, call out that conversations are participant-first, not listing-first, so multiple items with the same person can now live in one thread
9. In the thread view, show the item chip rail and explain that pending items appear first, active items next, and older inactive history remains available for reference
10. Click an unavailable or completed item chip to show that local history focus changes without rewriting the shared thread state
11. Point out that offer system cards and titles are viewer-aware, so buyers and sellers read different first-name-based status copy
12. Revisit the seller profile to show banner, connectors, overall rating, and percent-based trust metrics
13. If time allows, show the owner profile editor updating public-facing trust context

## Seeded Demo Scenarios

- `Desk Lamp` stays `active` and has 3 inbound `pending` offers from different buyers
- `Mini Fridge` is already `reserved` with 1 `accepted` offer, 1 `declined` offer, and a ready-to-open thread from `/offers`
- Community listings cover all 8 categories and include additional `active`, `reserved`, and `sold` states in the public feed
- The presenter also has outbound offers on community listings so buyer mode is populated
- `/messages` opens into 7 believable participant-first conversation threads spread across the last 2 days
- Several seeded threads intentionally include multiple linked items with mixed active, pending, completed, unavailable, and deleted-item history
- Seeded chat history includes viewer-aware sent/accepted/rejected/completed offer events plus per-message item context
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
- Messaging inbox shows multiple believable participant-first threads with compact item previews
- Thread view opens with item context, per-message item pills, and viewer-aware offer system cards
- Selecting old item chips updates local thread focus without breaking the shared conversation state
- Trust metrics render on the profile
- Presenter profile uses the expected Clerk identity when `DEMO_USER_EMAIL` is used
- Profile editing saves public trust fields for the signed-in owner
