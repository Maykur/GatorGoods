import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { getTransactionByOfferId, submitTransactionDecision } from '../lib/transactionsApi';
import { toTransactionViewModel } from '../lib/viewModels';
import {
  AppIcon,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBanner,
  PageHeader,
  Skeleton,
} from '../components/ui';
import { APPROVED_PICKUP_HUBS } from '../lib/pickupHubs';
import { cn } from '../lib/ui';
import campusPickupMap from '../assets/uf_map_ui_slate_blue.png';

const API_BASE_URL = 'http://localhost:5000';

function getStatusBadgeVariant(status) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'problemReported':
    case 'cancelled':
      return 'danger';
    case 'buyerConfirmed':
    case 'sellerConfirmed':
      return 'warning';
    default:
      return 'info';
  }
}

function TransactSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-[1.25rem]" />
          ))}
        </div>
      </Card>
    </div>
  );
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

function OrderMetaCard({ icon, label, value, emphasis = false }) {
  return (
    <Card variant="subtle" className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
        <AppIcon icon={icon} className="text-[0.95em]" />
        <span>{label}</span>
      </div>
      <p className={emphasis ? 'text-lg font-semibold text-white' : 'text-sm font-semibold text-white'}>
        {value}
      </p>
    </Card>
  );
}

function getStatusMessage(status) {
  switch (status) {
    case 'completed':
      return 'Both sides have confirmed the handoff. This transaction is marked as completed.';
    case 'buyerConfirmed':
      return 'The buyer has confirmed the exchange. Waiting on the seller to confirm too.';
    case 'sellerConfirmed':
      return 'The seller has confirmed the exchange. Waiting on the buyer to confirm too.';
    case 'problemReported':
      return 'A problem was reported for this handoff. Both submissions are preserved so nothing gets silently overwritten.';
    case 'cancelled':
      return 'This transaction has been cancelled.';
    case 'scheduled':
      return 'Your meetup is scheduled. Use this page to confirm the handoff or report a problem after the exchange.';
    default:
      return 'Check your messages for the latest updates on this transaction.';
  }
}

function ReadOnlyPickupMap({ selectedHubId }) {
  return (
    <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-[1.75rem] border border-white/10 bg-app-surface/80">
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(13,38,76,0.96),rgba(8,20,43,0.92))]"
      >
        <img
          src={campusPickupMap}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,112,10,0.18),_transparent_30%),linear-gradient(180deg,rgba(8,20,43,0.08),rgba(8,20,43,0.24))]" />
        <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-app-soft">
          Campus Map
        </div>
      </div>
      <div className="absolute inset-0 z-10">
        {APPROVED_PICKUP_HUBS.map((hub) => {
          const isSelected = hub.id === selectedHubId;
          return (
            <div
              key={hub.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hub.mapX}%`, top: `${hub.mapY}%`, zIndex: isSelected ? 20 : 10 }}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border shadow-lg transition-all',
                  isSelected
                    ? 'scale-110 border-gatorOrange bg-gatorOrange text-white shadow-[0_10px_24px_rgba(250,112,10,0.34)]'
                    : 'border-white/10 bg-app-surface/80 text-app-muted opacity-40'
                )}
              >
                <AppIcon icon="location" className="text-sm" />
              </span>
              {isSelected ? (
                <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gatorOrange/35 bg-gatorOrange/16 px-3 py-1 text-xs font-medium text-white shadow-md">
                  {hub.shortLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TransactPage() {
  const { orderId } = useParams();
  const { user, isLoaded } = useUser();
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided.');
      setIsLoading(false);
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (!user?.id) {
      setTransaction(null);
      setError('Sign in to view this transaction.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const rawTransaction = await getTransactionByOfferId(orderId, {
        participantId: user.id,
      });

      const listingId = rawTransaction.listingId?.toString?.() || rawTransaction.listingId || '';
      const counterpartId =
        user?.id === rawTransaction.sellerClerkUserId
          ? rawTransaction.buyerClerkUserId
          : rawTransaction.sellerClerkUserId;

      const [listingData, profileData] = await Promise.all([
        listingId ? fetchOptionalJson(`${API_BASE_URL}/items/${listingId}`) : null,
        counterpartId ? fetchOptionalJson(`${API_BASE_URL}/profile/${counterpartId}`) : null,
      ]);

      const isSeller = user?.id === rawTransaction.sellerClerkUserId;

      const transactionView = toTransactionViewModel(rawTransaction, {
        listing: listingData,
        buyerProfile: isSeller ? profileData : null,
        sellerProfile: !isSeller ? profileData : null,
      });

      setTransaction(transactionView);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, orderId, user?.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleDecision = useCallback(async (decision) => {
    if (!transaction?.transactionId || !user?.id) {
      return;
    }

    try {
      setIsSubmittingDecision(true);
      setError('');
      await submitTransactionDecision(transaction.transactionId, {
        requesterClerkUserId: user.id,
        decision,
      });
      await loadOrder();
    } catch (submissionError) {
      setError(submissionError.message || 'Failed to update this transaction.');
    } finally {
      setIsSubmittingDecision(false);
    }
  }, [loadOrder, transaction?.transactionId, user?.id]);

  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Transaction"
        icon="offers"
        title="Order details"
        description="Review the meetup location, price, payment method, and everything you need to complete this transaction."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/offers" className="no-underline">
              <Button variant="ghost" size="sm" leadingIcon="offers">
                Back to offers
              </Button>
            </Link>
            {transaction?.conversationId ? (
              <Link to={`/messages/${transaction.conversationId}`} className="no-underline">
                <Button size="sm" leadingIcon="messages">
                  Message {transaction?.sellerId === user?.id ? 'buyer' : 'seller'}
                </Button>
              </Link>
            ) : null}
            {transaction?.listingId ? (
              <Link to={`/items/${transaction.listingId}`} className="no-underline">
                <Button variant="secondary" size="sm" leadingIcon="listing">View listing</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <ErrorBanner
          title="We couldn't load the order"
          message={`${error} Refresh and try again in a moment.`}
        />
      ) : null}

      {isLoading ? <TransactSkeleton /> : null}

      {!isLoading && !error && transaction ? (
        <div className="space-y-6">
          {/* Listing & status header */}
          <Card className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white">{transaction.listingTitle}</h2>
                  <Badge variant={getStatusBadgeVariant(transaction.status)}>{transaction.status}</Badge>
                  <Badge variant={getStatusBadgeVariant(transaction.listingStatus)}>{transaction.listingStatusLabel}</Badge>
                </div>
                <p className="text-sm leading-7 text-app-soft">
                  {getStatusMessage(transaction.status)}
                </p>
              </div>

              <Link
                to={`/items/${transaction.listingId}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition hover:text-white"
              >
                <AppIcon icon="open" className="text-[0.95em]" />
                <span>View listing</span>
              </Link>
            </div>
          </Card>

          {/* Order details — item, meetup, summary, and counterpart combined */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="listing" className="text-[0.95em]" />
              <span>Order Details</span>
            </div>

            {/* Item photo — centered at top, uncropped */}
            {transaction.listingImageUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="overflow-hidden rounded-2xl bg-app-surface/60 w-48 h-48 flex items-center justify-center">
                  <img
                    src={transaction.listingImageUrl}
                    alt={transaction.listingTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* Seller row */}
                <div className="w-full max-w-sm space-y-2">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Link to={`/profile/${transaction.sellerId}`} className="no-underline flex-shrink-0">
                        <Avatar src={transaction.sellerAvatarUrl} name={transaction.sellerName} size="sm" />
                      </Link>
                      <p className="text-sm text-app-soft truncate">
                        <Link to={`/profile/${transaction.sellerId}`} className="font-semibold text-white no-underline hover:underline">
                          {transaction.sellerName}
                        </Link>
                        {'\u2019s '}{transaction.listingTitle}
                      </p>
                    </div>
                    <span className="w-28 flex items-center gap-1.5 text-sm font-bold text-white flex-shrink-0">
                      <AppIcon icon="payment" className="text-gatorOrange text-[1.25rem]" />
                      {transaction.offeredPriceLabel}
                    </span>
                  </div>

                  {/* Location & time row */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs text-app-muted">
                    <span className="flex items-center gap-2.5">
                      <span className="w-10 flex-shrink-0 flex items-center justify-center">
                        <AppIcon icon="location" className="text-gatorOrange text-[1.25rem]" />
                      </span>
                      {transaction.meetupLocation}
                    </span>
                    <span className="w-28 flex items-center gap-1.5 flex-shrink-0">
                      <AppIcon icon="time" className="text-gatorOrange text-[1.25rem]" />
                      {transaction.meetupScheduleLabel}
                    </span>
                  </div>

                  {transaction.pickupSpecifics ? (
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3 text-xs text-app-muted">
                      <span className="flex items-start gap-2.5">
                        <span className="w-10 flex-shrink-0 flex items-center justify-center">
                          <AppIcon icon="messages" className="text-gatorOrange text-[1.25rem]" />
                        </span>
                        <span>{transaction.pickupSpecifics}</span>
                      </span>
                      <span className="w-28 text-right uppercase tracking-[0.14em] text-app-muted/80">
                        Pickup specifics
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Meetup map */}
            {transaction.meetupHubId ? (
              <div className="flex justify-center">
                <ReadOnlyPickupMap selectedHubId={transaction.meetupHubId} />
              </div>
            ) : null}

            {/* Exchange actions */}
            <div className="flex justify-center gap-3 pt-1">
              <Button
                leadingIcon="verified"
                onClick={() => handleDecision('confirmed')}
                disabled={isSubmittingDecision}
              >
                {isSubmittingDecision ? 'Saving...' : 'Confirm exchange'}
              </Button>
              <Button
                variant="danger"
                className="bg-red-600 hover:bg-red-500"
                onClick={() => handleDecision('problemReported')}
                disabled={isSubmittingDecision}
              >
                Report a problem
              </Button>
            </div>
          </Card>


        </div>
      ) : null}
    </section>
  );
}
