# Architecture

This document defines the intended product architecture for the current implementation pass.

## Product Rules

- Browsing listings, item pages, and public profiles is public
- Creating listings, sending offers, messaging, reporting, reviewing, and editing profile/listing data requires a signed-in Clerk user
- The backend must derive the acting user from verified Clerk auth rather than trusting client-submitted user IDs
- Email addresses and other private account data must never be exposed on public surfaces

## Route Map

- `/` - landing page
- `/listings` - public marketplace feed
- `/items/:id` - public item detail page
- `/login` - Clerk sign-in
- `/signup` - Clerk sign-up
- `/create` - protected create/edit listing flow
- `/offers` - protected buyer/seller offer inbox
- `/messages` - protected conversation list
- `/messages/:conversationId` - protected thread view
- `/transactions` - protected transaction list
- `/transactions/:id` - protected transaction detail view
- `/profile/:clerkUserId` - public seller profile
- `/profile/me` - private profile and listing management view

## Data Model

### Profiles

- `clerkUserId`
- `email`
- `displayName`
- `avatarUrl`
- `bannerUrl`
- `bio`
- `instagramUrl`
- `linkedinUrl`
- `ufVerified`
- `trustMetrics`
- `completedSales`
- `completedPurchases`
- `createdAt`
- `updatedAt`

### Listings

- `sellerClerkUserId`
- `sellerDisplayName`
- `title`
- `price`
- `condition`
- `location`
- `imageUrl`
- `description`
- `details`
- `status` = `active | reserved | sold | archived`
- `createdAt`
- `updatedAt`

### Offers

- `listingId`
- `buyerClerkUserId`
- `sellerClerkUserId`
- `conversationId`
- `offeredPrice`
- `meetupLocation`
- `meetupWindow`
- `paymentMethod` = `cash | externalApp | gatorgoodsEscrow`
- `escrowMode` = `none | deposit | full`
- `message`
- `status` = `pending | countered | accepted | declined | cancelled | convertedToTransaction`
- `createdAt`
- `updatedAt`

### Conversations

- `participantIds`
- `linkedListingIds`
- `activeListingId`
- `lastMessageAt`
- `lastReadAtByUser`
- `createdAt`
- `updatedAt`

### Messages

- `conversationId`
- `senderClerkUserId`
- `body`
- `attachedListingId`
- `createdAt`

### Transactions

- `offerId`
- `listingId`
- `conversationId`
- `buyerClerkUserId`
- `sellerClerkUserId`
- `paymentMethod`
- `escrowMode`
- `escrowAmount`
- `buyerPin`
- `sellerPin`
- `buyerEnteredSellerPin`
- `sellerEnteredBuyerPin`
- `status` = `scheduled | awaitingEscrow | escrowHeld | pinPending | confirmed | completed | cancelled | refunded | noShow | rescheduled`
- `createdAt`
- `updatedAt`

### Reviews

- `transactionId`
- `reviewerClerkUserId`
- `revieweeClerkUserId`
- `outcome` = `completed | rescheduled | noShow`
- `onTime`
- `communicationGood`
- `feltSafe`
- `itemAsDescribed`
- `comment`
- `createdAt`

### Reports

- `reporterClerkUserId`
- `targetType` = `listing | user | message`
- `targetId`
- `reason`
- `details`
- `status`
- `createdAt`

## Reputation Rules

- `Reliability`, `Accuracy`, and `Responsiveness` are percent-based metrics
- Metrics should be computed from recent confirmed transactions rather than inflated lifetime totals
- Item pages, offer surfaces, and public profiles should expose trust information early in the flow

## API Shape

- `POST /api/profiles/sync`
- `GET /api/profiles/:clerkUserId`
- `GET /api/listings`
- `GET /api/listings/:id`
- `POST /api/listings`
- `PATCH /api/listings/:id`
- `DELETE /api/listings/:id`
- `POST /api/listings/:id/offers`
- `GET /api/offers?role=buyer|seller`
- `PATCH /api/offers/:id`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/transactions/:id/escrow`
- `POST /api/transactions/:id/pin-verify`
- `POST /api/transactions/:id/confirm`
- `POST /api/reviews`
- `GET /api/reviews/summary/:clerkUserId`
- `POST /api/reports`

## Key Implementation Decisions

- Clerk remains the identity provider; there is no custom auth rewrite
- Escrow is simulated for HCI and trust-flow purposes; no real payment processor is required for the class deliverable
- Messaging is people-first with attached item context, not one thread per item
- REST plus polling is acceptable for v1; websockets are not required to complete the project
