# Evaluation Plan

This document defines the intended study setup for the implementation and final evaluation phases.

## Study Goal

Measure whether GatorGoods improves trust formation and transaction coordination compared to a more generic marketplace-style flow.

## Conditions

### Baseline

- Simpler negotiation flow
- Reduced trust context
- Minimal item-context guidance in conversations
- No simulated escrow/PIN interaction

### Enhanced

- Offer-first negotiation
- Seller trust metrics visible early
- Item-context messaging
- Optional simulated escrow and dual PIN release

## Core Tasks

1. Find a listing that matches a campus pickup need
2. Decide whether the seller appears trustworthy
3. Send or respond to a structured offer
4. Coordinate the exchange inside the app
5. Complete the transaction flow and leave structured feedback

## Primary Metrics

- Task completion rate
- Task completion time
- Self-reported trust/confidence rating
- Self-reported ease of coordination
- Qualitative feedback on safety and convenience

## Secondary Metrics

- Whether participants understood the trust metrics
- Whether item-context messaging reduced confusion
- Whether escrow/PIN steps felt helpful or too heavy

## Participants

- UF students or close proxies who match the target audience
- Participants should use the app in a browser without installing anything

## Data To Collect

- Condition used
- Task start and end times
- Success/failure per task
- Confidence/trust rating after key tasks
- Brief post-task comments
- Final interview or survey feedback

## Demo And Study Accounts

Minimum roles needed before running the final study:

- Seller account
- Buyer account
- Second buyer or backup account for conflicting-offer and reservation flows

## Risks To Watch

- If the baseline and enhanced conditions diverge too much, the comparison becomes muddy
- If demo data is stale, study participants may waste time on setup rather than evaluating the product
- If trust metrics are not understandable at a glance, the proposed HCI contribution weakens
