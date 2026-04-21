# Study Runbook

This folder contains a simple, ready-to-run study packet for comparing GatorGoods against Facebook Marketplace.

This plan is intentionally practical, not overly formal. It is designed so any teammate can run a session with minimal interpretation.

## Files In This Folder

- `Tasks.md`: participant tasks only
- `Script.md`: moderator script only
- `Session_Checklist.md`: one-page run checklist for teammates
- `Primary_Secondary_Hypothesis.md`: study hypotheses and what to measure
- `Survey_Questions.md`: 3 short surveys to build in Qualtrics

## Recommended Study Structure

Each participant completes 4 conditions:

1. Buy on GatorGoods
2. Buy on Facebook Marketplace
3. Sell on GatorGoods
4. Sell on Facebook Marketplace

Use one of these two orders:

- Order A: `Buy GatorGoods -> Buy Facebook -> Sell GatorGoods -> Sell Facebook`
- Order B: `Buy Facebook -> Buy GatorGoods -> Sell Facebook -> Sell GatorGoods`

Use Order A for half the participants and Order B for the other half.

This is the simplest counterbalancing scheme and is easy for the team to run correctly.

## Why The Study Is Grouped By Condition

The study is grouped by condition, not by platform.

That means participants do both buying tasks back-to-back, then both selling tasks back-to-back.

Reason:

- it keeps the participant in the same mindset while comparing platforms
- it makes the comparison easier for participants to explain
- it matches the survey split in `Survey_Questions.md`
- it is easier for moderators to keep consistent

## Core Study Assumption

For all tasks, participants should assume they are UF students living on or very near campus, and that all exchanges should be practical for an on-campus lifestyle.

## What To Prepare Before Each Session

### GatorGoods

1. Start the frontend and backend.
2. Run the demo seed.
3. Sign in to GatorGoods using the prepared presenter/study account.
4. Confirm the seed still shows the expected listings, offers, and messages.

The current implementation already supports:

- public browsing
- seller trust context on item and profile pages
- structured offer creation
- seller offers inbox
- buyer/seller messaging
- transaction pages for accepted offers

That means GatorGoods does not need a live responder for the core study.

### Facebook Marketplace

1. Open the Marketplace tab before the session starts.
2. For the buyer condition, choose one real public Gainesville-area listing that roughly matches the GatorGoods scenario for that participant.
3. For the seller condition, make sure the moderator is already logged in to a Facebook account before the session starts if the team wants participants to use the real seller-side listing flow.

Important:

- do not require participants to send a real message to a stranger on Facebook
- do not require participants to publish a real Facebook listing unless the moderator is already comfortable using a team-owned account

The required minimum is to inspect the real buyer flow and the real seller listing-creation flow.

## Recommended Session Length

Aim for about 20 to 30 minutes total.

Suggested timing:

- 3 minutes: intro and Survey 1
- 7 to 9 minutes: two buyer conditions
- 3 minutes: Survey 2
- 7 to 9 minutes: two seller conditions
- 3 to 5 minutes: Survey 3 and wrap-up

## Recommended Platform Materials

### GatorGoods Buyer Scenario

Use one active seeded listing that feels campus-realistic, such as:

- `Three-Tier Rolling Cart`
- `Drafting Lab Stool`
- `Kitchen Utility Cart`

### Facebook Buyer Scenario

Pick one real existing Facebook Marketplace listing that matches the same general category as the GatorGoods item for that participant.

Good categories:

- small furniture
- storage
- electronics
- study/home items

Avoid:

- cars
- boats
- rentals
- oversized items
- anything that does not make sense for a student living near campus

### GatorGoods Seller Scenario

Use the signed-in presenter account.

Have the participant:

- create one listing for the provided study item
- inspect the seller-side tools already populated by the seed

For seller-side review, use the seeded presenter data that already contains inbound offers and existing conversations.

### Facebook Seller Scenario

Use the real Facebook Marketplace seller-side listing flow.

To keep the study easy to run:

- participants should go through the seller flow far enough to understand what information the platform asks for
- they do not need to publish if the moderator does not want to post a real listing

## What The Moderator Should Record Outside The Surveys

For each condition, write down:

- whether the participant completed the condition
- start time and end time
- major confusion points
- any trust-related comments
- any campus-specific comments
- whether the participant said they would continue or stop

This can be done in a simple notebook, Google Doc, or spreadsheet.

## Important Simplifications

These simplifications are intentional:

- no live responder is required
- no waiting for replies is required
- Facebook buyer tasks stop before sending a real message
- Facebook seller tasks do not require publishing unless the moderator chooses to use a team-owned account
- GatorGoods can rely on seeded seller/buyer data instead of improvising live interactions

## Minimum Success Criteria

The study is ready to run if:

- GatorGoods is seeded and signed in
- Facebook Marketplace is open
- the moderator has selected a Facebook buyer listing for the session
- the moderator knows whether the Facebook seller condition will stop before publish or use a real team-owned account
- the moderator has assigned Order A or Order B
- the moderator has the surveys ready
