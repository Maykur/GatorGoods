import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { getIndividualOffer } from '../lib/offersApi';
import { toOfferCardViewModel } from '../lib/viewModels';
import {
  AppIcon,
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
    case 'accepted':
      return 'success';
    case 'declined':
    case 'cancelled':
      return 'danger';
    case 'countered':
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
    case 'accepted':
      return 'This offer has been accepted. Head to the meetup location at the agreed time to complete the transaction.';
    case 'declined':
      return 'This offer was declined by the seller.';
    case 'cancelled':
      return 'This offer has been cancelled.';
    case 'countered':
      return 'The seller has countered this offer. Check your messages for details.';
    case 'pending':
      return 'This offer is awaiting a response from the seller.';
    case 'convertedToTransaction':
      return 'This offer has been converted into a confirmed transaction.';
    default:
      return 'Check your messages for the latest updates on this order.';
  }
}

function ReadOnlyPickupMap({ selectedHubId }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/10 bg-app-surface/80">
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
  const { user } = useUser();
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const rawOffer = await getIndividualOffer(orderId);

      const listingId = rawOffer.listingId?.toString?.() || rawOffer.listingId || '';
      const counterpartId =
        user?.id === rawOffer.sellerClerkUserId
          ? rawOffer.buyerClerkUserId
          : rawOffer.sellerClerkUserId;

      const [listingData, profileData] = await Promise.all([
        listingId ? fetchOptionalJson(`${API_BASE_URL}/items/${listingId}`) : null,
        counterpartId ? fetchOptionalJson(`${API_BASE_URL}/profile/${counterpartId}`) : null,
      ]);

      const isSeller = user?.id === rawOffer.sellerClerkUserId;

      const offerView = toOfferCardViewModel(rawOffer, {
        listing: listingData,
        buyerProfile: isSeller ? profileData : null,
        sellerProfile: !isSeller ? profileData : null,
      });

      setOffer(offerView);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, user?.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const isSeller = user?.id && offer?.sellerId === user.id;
  const counterpartLabel = isSeller ? 'Buyer' : 'Seller';
  const counterpartName = isSeller ? offer?.buyerName : offer?.sellerName;
  const counterpartId = isSeller ? offer?.buyerId : offer?.sellerId;
  const counterpartTrust = isSeller ? offer?.buyerTrust : offer?.sellerTrust;

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
            <Link to="/messages" className="no-underline">
              <Button variant="ghost" size="sm" leadingIcon="messages">
                Open messages
              </Button>
            </Link>
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

      {!isLoading && !error && offer ? (
        <div className="space-y-6">
          {/* Listing & status header */}
          <Card className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white">{offer.listingTitle}</h2>
                  <Badge variant={getStatusBadgeVariant(offer.status)}>{offer.status}</Badge>
                  <Badge variant={getStatusBadgeVariant(offer.listingStatus)}>{offer.listingStatusLabel}</Badge>
                </div>
                <p className="text-sm leading-7 text-app-soft">
                  {getStatusMessage(offer.status)}
                </p>
              </div>

              <Link
                to={`/items/${offer.listingId}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition hover:text-white"
              >
                <AppIcon icon="open" className="text-[0.95em]" />
                <span>View listing</span>
              </Link>
            </div>
          </Card>

          {/* Item photo & meetup map */}
          {(offer.listingImageUrl || offer.meetupHubId) ? (
            <Card className="space-y-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <AppIcon icon="listing" className="text-[0.95em]" />
                <span>Item &amp; Meetup Location</span>
              </div>
              <div className={cn('grid gap-5', offer.listingImageUrl && offer.meetupHubId ? 'sm:grid-cols-2' : '')}>
                {offer.listingImageUrl ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
                    <img
                      src={offer.listingImageUrl}
                      alt={offer.listingTitle}
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                {offer.meetupHubId ? (
                  <ReadOnlyPickupMap selectedHubId={offer.meetupHubId} />
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* Order details */}
          <Card className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <AppIcon icon="payment" className="text-[0.95em]" />
                <span>Order Summary</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OrderMetaCard icon="payment" label="Amount due" value={offer.offeredPriceLabel} emphasis />
              <OrderMetaCard icon="payment" label="Payment method" value={offer.paymentMethodLabel} />
              <OrderMetaCard icon="time" label="Meetup window" value={offer.meetupWindow} />
              <OrderMetaCard icon="location" label="Meetup hub" value={offer.meetupLocation} />
            </div>

            {offer.message ? (
              <div className="space-y-1 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                  <AppIcon icon="message" className="text-[0.95em]" />
                  <span>Note from {isSeller ? 'buyer' : 'you'}</span>
                </div>
                <p className="text-sm leading-7 text-app-soft">{offer.message}</p>
              </div>
            ) : null}
          </Card>

          {/* Counterpart info */}
          <Card className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{counterpartName}</h3>
                  <Badge variant="info">{counterpartLabel}</Badge>
                  {counterpartTrust ? (
                    <Badge variant="orange" icon="rating">{counterpartTrust.overallRatingLabel}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-app-soft">
                  {isSeller
                    ? 'This is the buyer you will be meeting for the transaction.'
                    : 'This is the seller you will be meeting for the transaction.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {counterpartId ? (
                  <Link to={`/profile/${counterpartId}`} className="no-underline">
                    <Button variant="ghost" size="sm" leadingIcon="seller">
                      {counterpartLabel} profile
                    </Button>
                  </Link>
                ) : null}
                {offer.conversationId ? (
                  <Link to={`/messages/${offer.conversationId}`} className="no-underline">
                    <Button variant="ghost" size="sm" leadingIcon="messages">
                      Conversation
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            {counterpartTrust ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OrderMetaCard icon="reliability" label="Reliability" value={counterpartTrust.reliabilityLabel} />
                <OrderMetaCard icon="accuracy" label="Accuracy" value={counterpartTrust.accuracyLabel} />
                <OrderMetaCard icon="responsiveness" label="Responsiveness" value={counterpartTrust.responsivenessLabel} />
                <OrderMetaCard icon="safety" label="Safety" value={counterpartTrust.safetyLabel} />
              </div>
            ) : null}
          </Card>

          {/* Quick actions */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="browse" className="text-[0.95em]" />
              <span>Quick actions</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {offer.conversationId ? (
                <Link to={`/messages/${offer.conversationId}`} className="no-underline">
                  <Button leadingIcon="messages">Message {counterpartLabel.toLowerCase()}</Button>
                </Link>
              ) : null}
              <Link to={`/items/${offer.listingId}`} className="no-underline">
                <Button variant="secondary" leadingIcon="listing">View listing</Button>
              </Link>
              <Link to="/offers" className="no-underline">
                <Button variant="ghost" leadingIcon="offers">All offers</Button>
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}