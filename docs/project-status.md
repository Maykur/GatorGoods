# Project Status

This file is the current source of truth for implementation scope and issue organization.

GitHub parent tracker: [#26 Track proposal-aligned implementation through final submission](https://github.com/Maykur/GatorGoods/issues/26)

## Current Goal

Ship a proposal-aligned UF marketplace that supports:

- UF-only authenticated participation for creating listings, offers, messaging, and reviews
- Public browsing of listings, item detail pages, and seller trust signals
- Offer-first negotiation with structured payment and meetup inputs
- People-first messaging with item context attached to the thread
- Trust-heavy public profiles with percent-based trust metrics
- Demo-ready seeded data for evaluation and presentation

## Current Implementation Snapshot

Implemented now:

- Public marketplace feed with filtering and visible listing status
- Public item detail pages with trust-forward seller context
- Structured offer creation from the item page
- Buyer and seller offers inboxes with seller-side comparison and accept/decline actions
- Listing reservation behavior after accepting an offer
- People-first messaging with linked item context
- Trust-heavy public profiles plus lightweight owner profile editing
- Demo seed script that creates active, reserved, and sold listing scenarios

Still storyboarded or stretch scope:

- Dedicated transaction detail views
- Simulated escrow and dual PIN release
- Post-meetup structured exchange rating flow

## Delivery Dates

- Evaluation-ready target: April 20, 2026
- Final submission target: April 22, 2026

## Active Milestones

- `Core Marketplace`
- `Negotiation + Messaging`
- `Trust + Transactions`
- `Evaluation Ready`
- `Final Submission`

## Issue Map

### Foundation

- [#11 Integrate open PRs and normalize app foundations](https://github.com/Maykur/GatorGoods/issues/11)
- [#12 Add backend Clerk auth and marketplace profile sync](https://github.com/Maykur/GatorGoods/issues/12)
- [#13 Normalize listing schema and enforce listing ownership](https://github.com/Maykur/GatorGoods/issues/13)
- [#14 Replace base64 listing images with multipart uploads](https://github.com/Maykur/GatorGoods/issues/14)

### Marketplace

- [#15 Build the public marketplace feed with campus-aware discovery](https://github.com/Maykur/GatorGoods/issues/15)
- [#16 Rebuild create/edit listing flow and seller listing management](https://github.com/Maykur/GatorGoods/issues/16)
- [#17 Ship the public item detail page with seller trust surfaces](https://github.com/Maykur/GatorGoods/issues/17)

### Offers And Messaging

- [#18 Implement structured offer-first creation and listing reservation](https://github.com/Maykur/GatorGoods/issues/18)
- [#19 Build the buyer/seller offers inbox](https://github.com/Maykur/GatorGoods/issues/19)
- [#20 Implement people-first messaging with attached item context](https://github.com/Maykur/GatorGoods/issues/20)

### Transactions And Reputation

- [#21 Add transaction records and transaction detail views](https://github.com/Maykur/GatorGoods/issues/21)
- [#22 Implement simulated escrow and dual PIN release](https://github.com/Maykur/GatorGoods/issues/22)
- [#23 Add structured reviews and percent-based reputation metrics](https://github.com/Maykur/GatorGoods/issues/23)
- [#24 Build public/private profile pages with trust context](https://github.com/Maykur/GatorGoods/issues/24)

### Evaluation And Submission

- [#25 Prepare study mode, demo data, and stronger test coverage](https://github.com/Maykur/GatorGoods/issues/25)

## Recommended Build Order

`#11 -> #12 -> #13/#14 -> #15/#16/#17 -> #18/#19/#20 -> #21/#22 -> #23/#24 -> #25`

## Issue Reality Check

The GitHub issue map above is still useful for historical grouping, but it no longer perfectly reflects branch reality. The repo is already past the core marketplace and negotiation milestones; the highest-value remaining work is polish, evaluation readiness, and clearly communicating which proposal ideas are implemented versus storyboarded.

## Blockers

- Shared Clerk configuration must remain available to the team
- Shared MongoDB connection must remain available to the team
- Demo/study accounts need to exist before the final evaluation and recording pass

## Ownership Rule

- Every implementation issue should have exactly one owner before it moves to `In Progress`
- Helper contributors are fine, but one person owns merge readiness and follow-up cleanup

## Superseded Planning Docs

The following repo-local planning docs are historical references, not the current source of truth:

- `.cursor/plans/gatorgoods_creative_design_ideas_0b330e0f.plan.md`
- `.cursor/plans/gatorgoods_implementation_plan_b1200267.plan.md`
- `.cursor/plans/next-steps-without-backend-access_d0fc09f5.plan.md`
