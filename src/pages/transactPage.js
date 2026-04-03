import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { getTransactionByOfferId } from '../lib/transactionsApi';
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
  useConfirmDialog,
} from '../components/ui';

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

function getStateBannerContent(status) {
  switch (status) {
    case 'buyerConfirmed':
      return {
        title: 'Waiting for seller confirmation',
        detail: 'The buyer marked the exchange as complete. The seller still needs to confirm the handoff.',
        className: 'border-amber-400/25 bg-amber-400/10 text-amber-50',
      };
    case 'sellerConfirmed':
      return {
        title: 'Waiting for buyer confirmation',
        detail: 'The seller marked the exchange as complete. The buyer still needs to confirm they received the item.',
        className: 'border-amber-400/25 bg-amber-400/10 text-amber-50',
      };
    case 'completed':
      return {
        title: 'Both sides confirmed',
        detail: 'This handoff is complete and both participants agreed on the outcome.',
        className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50',
      };
    case 'problemReported':
      return {
        title: 'Problem reported',
        detail: 'At least one participant reported an issue, so the transaction stays in a cautious state with both submissions preserved.',
        className: 'border-rose-400/25 bg-rose-400/10 text-rose-50',
      };
    default:
      return {
        title: 'Scheduled for handoff',
        detail: 'Review the accepted terms here, then confirm the outcome after you meet.',
        className: 'border-brand-blue/25 bg-brand-blue/10 text-blue-50',
      };
  }
}

function TransactionStateBanner({ status }) {
  const banner = getStateBannerContent(status);

  return (
    <div className={`rounded-[1.4rem] border px-5 py-4 ${banner.className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Transaction status</p>
      <h3 className="mt-2 text-lg font-semibold">{banner.title}</h3>
      <p className="mt-1 text-sm leading-7 opacity-90">{banner.detail}</p>
    </div>
  );
}

export function TransactPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { confirm } = useConfirmDialog();
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const isSeller = Boolean(user?.id && transaction?.sellerId === user.id);

  const handleReviewRoute = useCallback(async (decision) => {
    if (!orderId || !transaction || !user?.id) {
      return;
    }

    if (decision === 'problemReported') {
      const otherParticipantConfirmed = isSeller
        ? transaction.buyerDecision === 'confirmed'
        : transaction.sellerDecision === 'confirmed';

      if (otherParticipantConfirmed) {
        const shouldContinue = await confirm({
          title: 'Report a problem anyway?',
          description: 'The other person already confirmed the exchange went well. Continue only if you need to record a different outcome.',
          confirmLabel: 'Yes, continue',
          cancelLabel: 'Go back',
          tone: 'danger',
        });

        if (!shouldContinue) {
          return;
        }
      }
    }

    navigate(`/transact/${orderId}/review?decision=${encodeURIComponent(decision)}`);
  }, [confirm, isSeller, navigate, orderId, transaction, user?.id]);

  const counterpartRoleLabel = isSeller ? 'Buyer' : 'Seller';
  const counterpartName = isSeller ? transaction?.buyerName : transaction?.sellerName;
  const counterpartId = isSeller ? transaction?.buyerId : transaction?.sellerId;
  const counterpartAvatarUrl = isSeller ? transaction?.buyerAvatarUrl : transaction?.sellerAvatarUrl;
  const primaryActionLabel = isSeller ? 'I handed off the item' : 'I received the item';
  const problemActionLabel = 'There was a problem';
  const hasSubmittedReview = isSeller ? Boolean(transaction?.sellerReviewedAt) : Boolean(transaction?.buyerReviewedAt);

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
          <Card className="space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-1 flex-col gap-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-semibold text-white">{transaction.listingTitle}</h2>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>{transaction.status}</Badge>
                    <Badge variant={getStatusBadgeVariant(transaction.listingStatus)}>{transaction.listingStatusLabel}</Badge>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-app-soft">
                    {getStatusMessage(transaction.status)}
                  </p>
                </div>

                <TransactionStateBanner status={transaction.status} />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <OrderMetaCard icon="payment" label="Accepted price" value={transaction.offeredPriceLabel} emphasis />
                  <OrderMetaCard icon="payment" label="Payment" value={transaction.paymentMethodLabel} />
                  <OrderMetaCard icon="time" label="Scheduled meetup" value={transaction.meetupScheduleLabel} />
                  <OrderMetaCard icon="location" label="Meetup hub" value={transaction.meetupLocation} />
                </div>

                {transaction.pickupSpecifics ? (
                  <Card variant="subtle" className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      <AppIcon icon="locationDetails" className="text-[0.95em]" />
                      <span>Pickup specifics</span>
                    </div>
                    <p className="text-sm leading-7 text-white">{transaction.pickupSpecifics}</p>
                  </Card>
                ) : null}
              </div>

              <div className="w-full max-w-md space-y-4">
                <Card variant="subtle" className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                    <AppIcon icon="seller" className="text-[0.95em]" />
                    <span>{counterpartRoleLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {counterpartId ? (
                      <Link to={`/profile/${counterpartId}`} className="no-underline">
                        <Avatar src={counterpartAvatarUrl} name={counterpartName} size="md" />
                      </Link>
                    ) : (
                      <Avatar src={counterpartAvatarUrl} name={counterpartName} size="md" />
                    )}
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{counterpartName || counterpartRoleLabel}</p>
                      <p className="text-sm text-app-soft">
                        {counterpartRoleLabel} for this handoff
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transaction.conversationId ? (
                      <Link to={`/messages/${transaction.conversationId}`} className="no-underline">
                        <Button variant="ghost" size="sm" leadingIcon="messages">
                          Open conversation
                        </Button>
                      </Link>
                    ) : null}
                    {counterpartId ? (
                      <Link to={`/profile/${counterpartId}`} className="no-underline">
                        <Button variant="ghost" size="sm" leadingIcon="seller">
                          View {counterpartRoleLabel.toLowerCase()} profile
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </Card>

                {transaction.listingImageUrl ? (
                  <div className="flex justify-center">
                    <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-app-surface/60 p-4">
                      <img
                        src={transaction.listingImageUrl}
                        alt={transaction.listingTitle}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3">
                  <Button
                    leadingIcon="verified"
                    onClick={() => handleReviewRoute('confirmed')}
                    className="bg-gatorOrange text-white hover:bg-gatorOrange/90"
                    disabled={hasSubmittedReview}
                  >
                    {primaryActionLabel}
                  </Button>
                  <Button
                    variant="danger"
                    className="bg-red-600 hover:bg-red-500"
                    onClick={() => handleReviewRoute('problemReported')}
                    disabled={hasSubmittedReview}
                  >
                    {problemActionLabel}
                  </Button>
                  {hasSubmittedReview ? (
                    <p className="text-sm leading-7 text-app-muted">
                      You already submitted your review for this handoff, so these actions are now locked.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

        </div>
      ) : null}
    </section>
  );
}
