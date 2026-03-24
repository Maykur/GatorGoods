# Demo Runbook

Use this runbook for the final implementation video, class demo, and fallback live walkthroughs.

## Pre-Demo Checklist

- Verify `.env.local` contains the correct Clerk publishable key
- Verify backend `.env` contains a working MongoDB connection string
- Start frontend and backend successfully
- Confirm demo listings, offers, and transaction data exist
- Confirm all demo accounts can sign in

## Required Demo Roles

- Seller
- Buyer
- Backup buyer for reservation/conflict scenarios

## Recommended Demo Flow

1. Show the public landing page and marketplace feed
2. Show filtering and campus-aware listing discovery
3. Open a public item detail page and call out visible trust signals
4. Sign in as a buyer and submit a structured offer
5. Switch to the seller and review offers in the inbox
6. Accept the offer and move into the conversation thread
7. Show the transaction detail view
8. If using escrow, show the held payment state and PIN verification
9. Complete the transaction and submit structured reviews
10. Revisit the seller profile to show updated trust metrics

## Video Capture Notes

- Keep one seeded transaction in progress so the escrow/PIN flow can be shown quickly
- Keep one listing in `reserved` state and one in `sold` state for feed examples
- Avoid live data creation during the video unless the step is central to the story

## Fallback Plan

If one part of the live flow breaks:

- Fall back to the seeded data path rather than debugging on camera
- Skip nonessential profile-editing details before skipping trust, offer, messaging, or transaction flows
- If escrow is unstable, still show transaction status and explain that the escrow state is simulated in-app

## Manual Smoke Test Before Recording

- Public browse works
- Sign-in works
- Create listing works
- Item detail page loads
- Offer creation works
- Seller inbox shows the offer
- Messaging thread opens with listing context
- Transaction detail page loads
- Review submission works
- Trust metrics render on the profile
