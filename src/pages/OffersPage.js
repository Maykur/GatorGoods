import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { getOffers, updateOfferStatus, getIndividualOffer} from '../lib/offersApi';
import { toOfferCardViewModel } from '../lib/viewModels';
import {
  AppIcon,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';

const API_BASE_URL = 'http://localhost:5000';
const MIN_PICKUP_SPECIFICS_LENGTH = 8;
const MODE_OPTIONS = [
  { id: 'seller', label: 'Selling', icon: 'offers' },
  { id: 'buyer', label: 'Buying', icon: 'payment' },
];

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

function OffersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, nestedIndex) => (
              <Skeleton key={nestedIndex} className="h-20 rounded-[1.25rem]" />
            ))}
          </div>
        </Card>
      ))}
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
  } catch (error) {
    return null;
  }
}

function groupOfferViewsByListing(offerViews) {
  return offerViews.reduce((groups, offer) => {
    if (!groups[offer.listingId]) {
      groups[offer.listingId] = {
        listingId: offer.listingId,
        listingTitle: offer.listingTitle,
        listingStatus: offer.listingStatus,
        listingStatusLabel: offer.listingStatusLabel,
        offers: [],
      };
    }

    groups[offer.listingId].offers.push(offer);
    return groups;
  }, {});
}

function OfferMetaCard({ icon, label, value, emphasis = false }) {
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

function getFirstName(name) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return '';
  }

  return trimmedName.split(/\s+/)[0];
}

export function OffersPage() {
  const { user } = useUser();
  const { showToast } = useToast();
  const [mode, setMode] = useState('seller');
  const [sellerGroups, setSellerGroups] = useState([]);
  const [buyerOffers, setBuyerOffers] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState('');
  const [openAcceptanceOfferId, setOpenAcceptanceOfferId] = useState('');
  const [acceptanceSpecifics, setAcceptanceSpecifics] = useState('');
  const [acceptanceError, setAcceptanceError] = useState('');

  const loadOffers = useCallback(
    async (showLoadingState = true) => {
      if (!user?.id) {
        return;
      }

      const listingCache = new Map();
      const profileCache = new Map();

      try {
        if (showLoadingState) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const rawOffers = await getOffers({
          participantId: user.id,
          role: mode,
        });


        const offerViews = await Promise.all(
          rawOffers.map(async (offer) => {
            const listingId = offer.listingId?.toString?.() || offer.listingId || '';
            const listingPromise = listingId
              ? listingCache.get(listingId) || fetchOptionalJson(`${API_BASE_URL}/items/${listingId}`)
              : Promise.resolve(null);
            const counterpartId =
              mode === 'seller' ? offer.buyerClerkUserId : offer.sellerClerkUserId;
            const profilePromise = counterpartId
              ? profileCache.get(counterpartId) || fetchOptionalJson(`${API_BASE_URL}/profile/${counterpartId}`)
              : Promise.resolve(null);

            if (listingId && !listingCache.has(listingId)) {
              listingCache.set(listingId, listingPromise);
            }

            if (counterpartId && !profileCache.has(counterpartId)) {
              profileCache.set(counterpartId, profilePromise);
            }

            const [listingData, profileData] = await Promise.all([listingPromise, profilePromise]);

            return toOfferCardViewModel(offer, {
              listing: listingData,
              buyerProfile: mode === 'seller' ? profileData : null,
              sellerProfile: mode === 'buyer' ? profileData : null,
            });
          })
        );

        if (mode === 'seller') {
          const groupedOffers = Object.values(groupOfferViewsByListing(offerViews)).sort((firstGroup, secondGroup) =>
            firstGroup.listingTitle.localeCompare(secondGroup.listingTitle)
          );
          setSellerGroups(groupedOffers);
          setBuyerOffers([]);
        } else {
          setBuyerOffers(offerViews);
          setSellerGroups([]);
        }

        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Failed to load offers');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [mode, user?.id]
  );

  useEffect(() => {
    loadOffers();

    const intervalId = window.setInterval(() => {
      loadOffers(false);
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadOffers]);

  const handleOfferAction = async (offerId, nextStatus, pickupSpecifics = '') => {
    if (!user?.id) {
      return;
    }

    try {
      setActiveActionId(`${nextStatus}-${offerId}`);
      await updateOfferStatus(offerId, {
        requesterClerkUserId: user.id,
        status: nextStatus,
        ...(nextStatus === 'accepted' ? { pickupSpecifics } : {}),
      });
      await loadOffers(false);
      setOpenAcceptanceOfferId('');
      setAcceptanceSpecifics('');
      setAcceptanceError('');
      showToast({
        title: nextStatus === 'accepted' ? 'Offer accepted' : 'Offer declined',
        description:
          nextStatus === 'accepted'
            ? 'The listing is now reserved and the meetup specifics are confirmed in the conversation.'
            : 'The buyer will see that this offer was declined.',
        variant: 'success',
      });
    } catch (updateError) {
      setError(updateError.message || 'Unable to update offer right now.');
    } finally {
      setActiveActionId('');
    }
  };

  const handleConfirmAcceptance = async (offerId) => {
    const trimmedSpecifics = acceptanceSpecifics.trim();

    if (trimmedSpecifics.length < MIN_PICKUP_SPECIFICS_LENGTH) {
      setAcceptanceError(`Meetup specifics must be at least ${MIN_PICKUP_SPECIFICS_LENGTH} characters.`);
      return;
    }

    await handleOfferAction(offerId, 'accepted', trimmedSpecifics);
  };

  const totalOffers = mode === 'seller'
    ? sellerGroups.reduce((count, group) => count + group.offers.length, 0)
    : buyerOffers.length;

  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Offers"
        icon="offers"
        title="Offers for your listings and the ones you've sent"
        description="Switch between selling and buying to check prices, payment methods, and pickup details."
        actions={
          <Link to="/messages" className="no-underline">
            <Button variant="ghost" size="sm" leadingIcon="messages">
              Open messages
            </Button>
          </Link>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Offers inbox modes">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={mode === option.id}
              onClick={() => setMode(option.id)}
              className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                mode === option.id
                  ? 'border-gatorOrange/50 bg-gatorOrange/15 text-white'
                  : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <AppIcon icon={option.icon} className="text-[0.95em]" />
                <span>{option.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-soft">
            {totalOffers} {totalOffers === 1 ? 'offer' : 'offers'} {mode === 'seller' ? 'received' : 'sent'}
          </p>
          {isRefreshing ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              Refreshing offers...
            </p>
          ) : null}
        </div>
      </Card>

      {error ? (
        <ErrorBanner
          title="We couldn't load the offers inbox"
          message={`${error}. Refresh and try again in a moment.`}
        />
      ) : null}

      {isLoading ? <OffersSkeleton /> : null}

      {!isLoading && !error && mode === 'seller' && sellerGroups.length === 0 ? (
        <EmptyState
          icon="offers"
          title="No incoming offers yet"
          description="When someone sends an offer on one of your listings, you'll see the price, payment method, and pickup plan here."
          action={
            <Link to="/listings" className="no-underline">
              <Button variant="secondary" leadingIcon="browse">Browse listings</Button>
            </Link>
          }
        />
      ) : null}

      {!isLoading && !error && mode === 'buyer' && buyerOffers.length === 0 ? (
        <EmptyState
          icon="offers"
          title="No sent offers yet"
          description="Send an offer from any item page and you'll be able to check it here."
          action={
            <Link to="/listings" className="no-underline">
              <Button leadingIcon="browse">Browse listings</Button>
            </Link>
          }
        />
      ) : null}

      {!isLoading && !error && mode === 'seller' && sellerGroups.length > 0 ? (
        <div className="space-y-6">
          {sellerGroups.map((group) => (
            <Card key={group.listingId} className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{group.listingTitle}</h2>
                    <Badge variant={getStatusBadgeVariant(group.listingStatus)}>{group.listingStatusLabel}</Badge>
                  </div>
                  <p className="text-sm leading-7 text-app-soft">
                    See each buyer's price, payment method, and pickup plan in one place.
                  </p>
                </div>

                <Link to={`/items/${group.listingId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition hover:text-white">
                  <AppIcon icon="open" className="text-[0.95em]" />
                  <span>Open listing</span>
                </Link>
              </div>

              <div className="space-y-4">
                {group.offers.map((offer) => {
                  const buyerFirstName = getFirstName(offer.buyerName);
                  const meetupHintTarget = buyerFirstName || 'the buyer';

                  return (
                  <Card key={offer.id} variant="subtle" className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-white">{offer.buyerName}</h3>
                          <Badge variant={getStatusBadgeVariant(offer.status)}>{offer.status}</Badge>
                          {offer.buyerTrust ? (
                            <Badge variant="orange" icon="rating">{offer.buyerTrust.overallRatingLabel}</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-app-soft">
                          {offer.message || 'No note attached to this offer.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/profile/${offer.buyerId}`} className="no-underline">
                          <Button variant="ghost" size="sm" leadingIcon="seller">Buyer profile</Button>
                        </Link>
                        {offer.conversationId ? (
                          <Link to={`/messages/${offer.conversationId}`} className="no-underline">
                            <Button variant="ghost" size="sm" leadingIcon="messages">Conversation</Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <OfferMetaCard icon="payment" label="Offer" value={offer.offeredPriceLabel} emphasis />
                        <OfferMetaCard icon="payment" label="Payment" value={offer.paymentMethodLabel} />
                        <OfferMetaCard icon="time" label="Scheduled meetup" value={offer.meetupScheduleLabel} />
                        <OfferMetaCard icon="location" label="Proposed meetup hub" value={offer.meetupLocation} />
                      </div>

                    {offer.buyerTrust ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <OfferMetaCard icon="reliability" label="Reliability" value={offer.buyerTrust.reliabilityLabel} />
                        <OfferMetaCard icon="accuracy" label="Accuracy" value={offer.buyerTrust.accuracyLabel} />
                        <OfferMetaCard icon="responsiveness" label="Responsiveness" value={offer.buyerTrust.responsivenessLabel} />
                        <OfferMetaCard icon="safety" label="Safety" value={offer.buyerTrust.safetyLabel} />
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        leadingIcon="verified"
                        onClick={() => {
                          setOpenAcceptanceOfferId((currentOfferId) =>
                            currentOfferId === offer.id ? '' : offer.id
                          );
                          setAcceptanceSpecifics('');
                          setAcceptanceError('');
                          setError('');
                        }}
                        loading={activeActionId === `accepted-${offer.id}` && openAcceptanceOfferId !== offer.id}
                        disabled={offer.status !== 'pending'}
                      >
                        {openAcceptanceOfferId === offer.id ? 'Hide acceptance details' : 'Accept'}
                      </Button>
                      <Button
                        variant="secondary"
                        leadingIcon="delete"
                        onClick={() => handleOfferAction(offer.id, 'declined')}
                        loading={activeActionId === `declined-${offer.id}`}
                        disabled={offer.status !== 'pending'}
                      >
                        Decline
                      </Button>
                    </div>

                    {offer.status === 'pending' && openAcceptanceOfferId === offer.id ? (
                      <Card variant="subtle" className="space-y-4 border border-gatorOrange/20 bg-gatorOrange/5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                            <AppIcon icon="location" className="text-[0.95em]" />
                            <span>Meetup hub</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{offer.meetupLocation}</p>
                          <p className="text-sm leading-7 text-app-soft">
                            Accepting this offer will reserve the listing and confirm the exact meetup details in chat.
                          </p>
                        </div>

                        <Textarea
                          id={`acceptance-specifics-${offer.id}`}
                          label="Meetup specifics:"
                          required
                          leadingIcon="message"
                          rows={3}
                          value={acceptanceSpecifics}
                          error={acceptanceError}
                          onChange={(event) => {
                            setAcceptanceSpecifics(event.target.value);
                            setAcceptanceError('');
                            setError('');
                          }}
                          placeholder="North entrance by the benches, near the bike rack..."
                          hint={`Required: Share the exact entrance, room, or side of the building ${meetupHintTarget} should meet you at.`}
                        />

                        <div className="flex flex-wrap gap-3">
                          <Button
                            leadingIcon="verified"
                            onClick={() => handleConfirmAcceptance(offer.id)}
                            loading={activeActionId === `accepted-${offer.id}`}
                          >
                            Confirm acceptance
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setOpenAcceptanceOfferId('');
                              setAcceptanceSpecifics('');
                              setAcceptanceError('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Card>
                    ) : null}
                  </Card>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && !error && mode === 'buyer' && buyerOffers.length > 0 ? (
        <div className="space-y-4">
          {buyerOffers.map((offer) => (
            <Card key={offer.id} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{offer.listingTitle}</h2>
                    <Badge variant={getStatusBadgeVariant(offer.status)}>{offer.status}</Badge>
                    <Badge variant={getStatusBadgeVariant(offer.listingStatus)}>{offer.listingStatusLabel}</Badge>
                  </div>
                  <p className="text-sm text-app-soft">
                    Seller: {offer.sellerName}
                    {offer.sellerTrust ? ` • ${offer.sellerTrust.overallRatingLabel}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/items/${offer.listingId}`} className="no-underline">
                    <Button variant="ghost" size="sm" leadingIcon="listing">Listing</Button>
                  </Link>
                  <Link to={`/profile/${offer.sellerId}`} className="no-underline">
                    <Button variant="ghost" size="sm" leadingIcon="seller">Seller profile</Button>
                  </Link>
                  {offer.conversationId ? (
                    <Link to={`/messages/${offer.conversationId}`} className="no-underline">
                      <Button variant="ghost" size="sm" leadingIcon="messages">Conversation</Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OfferMetaCard icon="payment" label="Your offer" value={offer.offeredPriceLabel} emphasis />
                <OfferMetaCard icon="payment" label="Payment" value={offer.paymentMethodLabel} />
                <OfferMetaCard icon="time" label="Scheduled meetup" value={offer.meetupScheduleLabel} />
                <OfferMetaCard icon="location" label="Proposed meetup hub" value={offer.meetupLocation} />
              </div>

              <p className="text-sm leading-7 text-app-soft">
                {offer.message || 'No note attached to this offer.'}
              </p>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
