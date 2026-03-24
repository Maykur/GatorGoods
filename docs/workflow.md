# Workflow

This document defines the working rules for implementing and reviewing GatorGoods.

## Unit Of Work

- One issue = one branch = one PR
- Every implementation issue should have exactly one owner before work starts
- Parallel work is fine as long as branches do not fight over the same files without coordination

## Branch Naming

Use:

- `feat/<issue-number>-<short-slug>`
- `fix/<issue-number>-<short-slug>`
- `chore/<issue-number>-<short-slug>`

Examples:

- `feat/18-structured-offers`
- `feat/20-contextual-messaging`
- `chore/25-evaluation-readiness`

## PR Titles

Start PR titles with the issue number.

Examples:

- `[#18] Implement structured offer-first creation and listing reservation`
- `[#23] Add structured reviews and percent-based reputation metrics`

## Status Flow

- `Ready`
- `In Progress`
- `Blocked`
- `In Review`
- `Done`

Use issue comments, assignment, labels, and linked PRs to keep the status visible.

## Definition Of Done

Before closing a feature issue:

- Relevant code is merged
- Build and relevant tests pass
- Manual test steps are documented in the PR
- Screenshots are included for meaningful UI changes
- Follow-up work is split into a new issue instead of hidden in review comments
- Docs are updated if routes, contracts, or product behavior changed

## Labels

Keep labels lightweight and consistent:

- Area labels for subsystem ownership
- Type labels for feature, bug, and chore work
- Priority labels for sequencing
- `blocked` only when an issue cannot move without another dependency

## Milestones

- `Core Marketplace`
- `Negotiation + Messaging`
- `Trust + Transactions`
- `Evaluation Ready`
- `Final Submission`
