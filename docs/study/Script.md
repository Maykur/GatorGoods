# Moderator Script

This document is for the moderator only.

Do not turn this document into the participant task sheet.

## Opening

Thanks for participating. Today you will use two marketplace platforms and complete both buying and selling activities on each one.

We are evaluating the platforms, not you. There are no right or wrong answers. If something feels confusing, missing, or awkward, that is useful feedback.

Please think aloud during the session. As you work, say what you are looking for, what you expect to happen, what feels clear or unclear, and what makes you trust or distrust the platform.

For this session, please assume you are a UF student living on or very near campus. Keep that assumption in mind throughout all parts of the study.

## Before The First Task

1. Confirm consent.
2. Give Survey 1.
3. Assign Order A or Order B.
4. Open the correct platform and scenario for the first condition.

## Setup Note For Moderators

Before the participant starts, make sure GatorGoods is signed into the correct study account.

- if using a shared prepared study account, a normal `SEED_FULL_RESET=true npm run seed:demo` is enough
- if using your own Clerk account, you should have seeded with `DEMO_USER_EMAIL` or `DEMO_USER_ID` before signing in so the presenter data is attached to your real account
- if you used `DEMO_USER_EMAIL`, keep `CLERK_SECRET_KEY` in `backend/.env` rather than putting the secret directly into a shared study command

## Important Moderator Rules

- stay neutral
- do not teach the interface
- do not explain where to click unless the participant is completely blocked
- do not compare the platforms for the participant
- do not require real Facebook contact with strangers

## Allowed Neutral Prompts

Use prompts like these if the participant goes quiet:

- What are you looking at right now?
- What do you expect to happen next?
- What information are you relying on here?
- What feels clear or unclear?
- What makes this feel trustworthy or untrustworthy?
- If this were real, what would you do next?

## If The Participant Gets Stuck

If the participant is stuck for about 2 minutes:

1. Give one neutral prompt.
2. If they are still stuck, say:

"That is fine. Please do the best you can with what is on the screen, and then move to your final judgment."

Do not rescue them by pointing out the correct action unless the session would otherwise stop completely.

## Buyer Conditions

Before each buyer condition, say:

"You are now doing a buying task on this platform. In this part, assume you are trying to buy a mini fridge for campus use. Please work through the task list and keep thinking aloud."

Start timing when they begin the first buyer task.

Stop timing when they make their final buying decision.

After both buyer conditions are complete, give Survey 2.

## Seller Conditions

Before each seller condition, say:

"You are now doing a selling task on this platform. In this part, assume you are listing the same study item on both platforms: a desk lamp that is used but in good working condition. Please work through the task list and keep thinking aloud."

Start timing when they begin the first seller task.

Stop timing when they make their final selling decision.

After both seller conditions are complete, give Survey 3.

## Platform-Specific Notes

### GatorGoods

- participants may use the real seeded app flow
- no live responder is required
- if the participant reaches an offer, inbox, or transaction page, let them inspect it naturally

### Facebook Marketplace

- participants should inspect the real buyer flow
- for the buyer task, let the participant search for a mini fridge and choose one they would seriously consider
- participants should not be required to send a real message to a stranger
- for seller flow, they should use the same study desk lamp image as in GatorGoods and only go far enough to understand what the platform asks them to do
- if the moderator is not comfortable publishing a listing, stop before the final publish step

## Transition Between Conditions

Use a short transition like:

"We are now switching to the next part of the study. Please treat this as a new task on a different platform."

Do not summarize or interpret the previous condition for them.

## Wrap-Up

After Survey 3, ask:

- Which platform would you rather use to buy from as a student living near campus?
- Which platform would you rather use to sell on as a student living near campus?
- What most affected your trust in each platform?
- What most affected your confidence in handling a meetup or exchange?
- What felt easiest?
- What felt most frustrating?

## What To Write Down During The Session

For each condition, record:

- participant ID
- assigned order
- start time
- end time
- completed or not completed
- buyer listing chosen, if applicable
- major confusion point
- strongest trust comment
- strongest coordination comment
- final yes/no decision

## Closing

That concludes the session. Thank you for your time and feedback.
