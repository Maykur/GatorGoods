import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { PickupHubPicker } from '../components/PickupHubPicker';
import { createConversation } from '../lib/messagesApi';
import { createOffer } from '../lib/offersApi';
import { getPickupHubById, resolvePickupHub } from '../lib/pickupHubs';
import { toListingDetailViewModel, toTrustMetricsViewModel } from '../lib/viewModels';
import {
  AppIcon,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBanner,
  getCategoryIcon,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useConfirmDialog,
  useToast,
} from '../components/ui';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'externalApp', label: 'External app' },
  { value: 'gatorgoodsEscrow', label: 'GatorGoods escrow' },
];

function getStatusBadgeVariant(status) {
  switch (status) {
    case 'reserved':
      return 'warning';
    case 'sold':
    case 'archived':
      return 'danger';
    default:
      return 'success';
  }
}

function validateOfferForm(values) {
  const errors = {};

  if (!values.offeredPrice.trim()) {
    errors.offeredPrice = 'Offer amount is required.';
  } else if (Number(values.offeredPrice) < 0) {
    errors.offeredPrice = 'Offer amount must be zero or greater.';
  }

  if (!values.meetupHubId.trim()) {
    errors.meetupHubId = 'Meetup hub is required.';
  }

  if (!values.meetupWindow.trim()) {
    errors.meetupWindow = 'Meetup window is required.';
  }

  if (!values.paymentMethod.trim()) {
    errors.paymentMethod = 'Payment method is required.';
  }

  return errors;
}

function LoadingState() {
  return (
    <section className="w-full space-y-6">
      <Skeleton className="h-6 w-36" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card padding="none" className="overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
        </Card>
        <Card className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    </section>
  );
}

function TrustMetricCard({ icon, label, value }) {
  return (
    <Card variant="subtle" className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
        <AppIcon icon={icon} className="text-sm" />
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </Card>
  );
}

export function ItemPage() {
  const { user, isSignedIn } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [item, setItem] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [favorite, setFav] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isOfferComposerOpen, setIsOfferComposerOpen] = useState(false);
  const [offerValues, setOfferValues] = useState({
    offeredPrice: '',
    meetupHubId: '',
    meetupWindow: '',
    paymentMethod: 'cash',
    message: '',
  });
  const [offerFieldErrors, setOfferFieldErrors] = useState({});
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [submittedOffer, setSubmittedOffer] = useState(null);
  const [error, setError] = useState('');

  const itemView = useMemo(
    () => (item ? toListingDetailViewModel(item, user?.id || null) : null),
    [item, user?.id]
  );
  const isOwner = Boolean(itemView?.isOwner);
  const trustMetrics = useMemo(() => toTrustMetricsViewModel(sellerProfile), [sellerProfile]);
  const categoryIcon = itemView ? getCategoryIcon(itemView.category) : null;
  const selectedMeetupHub = getPickupHubById(offerValues.meetupHubId);
  const selectedMeetupLabel = selectedMeetupHub?.label || '';

  useEffect(() => {
    let isMounted = true;

    const itemFetch = async () => {
      try {
        if (isMounted) {
          setIsLoading(true);
        }

        const itemResp = await fetch(`http://localhost:5000/items/${id}`);

        if (!itemResp.ok) {
          throw new Error('Failed to fetch');
        }

        const data = await itemResp.json();

        if (!isMounted) {
          return;
        }

        setItem(data);
        const defaultMeetupHubId = data.pickupHubId || resolvePickupHub(data.itemLocation)?.id || '';
        setOfferValues((currentValues) => ({
          ...currentValues,
          meetupHubId: defaultMeetupHubId,
        }));
        setError('');
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || 'Failed to fetch');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    itemFetch();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const loadSellerProfile = async () => {
      if (!item?.userPublishingID) {
        if (isMounted) {
          setSellerProfile(null);
        }
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/profile/${item.userPublishingID}`);

        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        const data = await response.json();

        if (isMounted) {
          setSellerProfile(data);
        }
      } catch (profileError) {
        if (isMounted) {
          setSellerProfile(null);
        }
      }
    };

    loadSellerProfile();

    return () => {
      isMounted = false;
    };
  }, [item?.userPublishingID]);

  useEffect(() => {
    let isMounted = true;

    const loadFavoriteState = async () => {
      if (!isSignedIn || !user?.id) {
        if (isMounted) {
          setFav(false);
        }
        return;
      }

      try {
        const userResp = await fetch(`http://localhost:5000/profile/${user.id}`);
        if (!userResp.ok) {
          throw new Error('Failed to fetch');
        }

        const favData = await userResp.json();
        if (isMounted) {
          setFav(Boolean(favData.profile.profileFavorites?.includes(id)));
        }
      } catch (favoriteError) {
        if (isMounted) {
          setFav(false);
        }
      }
    };

    loadFavoriteState();

    return () => {
      isMounted = false;
    };
  }, [id, isSignedIn, user?.id]);

  const toggleFavorite = async () => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    try {
      setIsFavoritePending(true);
      const method = favorite ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:5000/user/${user.id}/fav/${id}`, {
        method,
      });

      if (!response.ok) {
        throw new Error("Couldn't update favorite");
      }

      const nextFavoriteState = !favorite;
      setFav(nextFavoriteState);
      showToast({
        title: nextFavoriteState ? 'Saved to favorites' : 'Removed from favorites',
        description: nextFavoriteState
          ? 'This listing is now easier to find from your profile.'
          : 'The listing has been removed from your saved items.',
        variant: 'success',
      });
    } catch (favoriteError) {
      setError('Unable to update favorites right now.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleDelete = async () => {
    if (!itemView?.id) {
      return;
    }

    const shouldDelete = await confirm({
      title: 'Delete this listing?',
      description:
        'This removes the item from the marketplace and clears it from any saved favorites.',
      confirmLabel: 'Delete listing',
      cancelLabel: 'Keep listing',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:5000/item/${itemView.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error during delete');
      }

      showToast({
        title: 'Listing deleted',
        description: 'Your item has been removed from the marketplace.',
        variant: 'success',
      });
      navigate('/listings');
    } catch (deleteError) {
      setError(deleteError.message || 'Error during delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartConversation = async () => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    if (!item) {
      return;
    }

    try {
      setIsStartingConversation(true);
      const conversation = await createConversation({
        participantIds: [user.id, item.userPublishingID],
        activeListingId: item._id,
      });
      navigate(`/messages/${conversation._id}`);
    } catch (conversationError) {
      setError('Unable to start conversation');
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleOfferFieldChange = (field) => (event) => {
    setOfferValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }));
    setOfferFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));
  };

  const handleMeetupHubChange = (meetupHubId) => {
    setOfferValues((currentValues) => ({
      ...currentValues,
      meetupHubId,
    }));
    setOfferFieldErrors((currentErrors) => ({
      ...currentErrors,
      meetupHubId: '',
    }));
  };

  const handleOfferSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      navigate('/login');
      return;
    }

    if (!itemView?.id || !item) {
      return;
    }

    const nextErrors = validateOfferForm(offerValues);

    if (Object.keys(nextErrors).length > 0) {
      setOfferFieldErrors(nextErrors);
      setError('Please complete the offer details before sending it.');
      return;
    }

    try {
      setIsSubmittingOffer(true);
      const offer = await createOffer(itemView.id, {
        buyerClerkUserId: user.id,
        buyerDisplayName:
          user.fullName ||
          user.firstName ||
          user.username ||
          user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
          'Buyer',
        offeredPrice: Number(offerValues.offeredPrice),
        meetupHubId: offerValues.meetupHubId,
        meetupLocation: selectedMeetupLabel,
        meetupWindow: offerValues.meetupWindow,
        paymentMethod: offerValues.paymentMethod,
        message: offerValues.message,
      });

      setSubmittedOffer(offer);
      setIsOfferComposerOpen(false);
      setOfferFieldErrors({});
      setError('');
      showToast({
        title: 'Offer sent',
        description: 'The seller can now review your offer and reply from the offers page.',
        variant: 'success',
      });
    } catch (offerError) {
      setError(offerError.message || 'Unable to send offer right now.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!itemView) {
    return (
      <section className="w-full space-y-4">
        <Link to="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline hover:text-white">
          <AppIcon icon="back" className="text-[0.95em]" />
          <span>Back to listings</span>
        </Link>
        <ErrorBanner title="We couldn't open this listing" message={error || 'The requested item could not be loaded.'} />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <Link to="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition-colors hover:text-white">
        <AppIcon icon="back" className="text-[0.95em]" />
        <span>Back to listings</span>
      </Link>

      {error ? <ErrorBanner title="Listing issue" message={error} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex min-h-[22rem] items-center justify-center bg-gradient-to-br from-brand-blue/15 via-app-surface/90 to-gatorOrange/12">
            {itemView.imageUrl ? (
              <img
                src={itemView.imageUrl}
                alt={itemView.title}
                className="max-h-[32rem] w-full object-contain"
              />
            ) : (
              <div className="flex h-full min-h-[22rem] w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-app-muted">
                No image available
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-6">
            <PageHeader
              eyebrow={itemView.category}
              icon={categoryIcon}
              title={itemView.title}
              description="See the details, check the seller profile, and send an offer or message if you're interested."
            />

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-4xl font-semibold tracking-tight text-gatorOrange">
                {itemView.priceLabel}
              </p>
              <Badge condition={itemView.condition}>{itemView.condition}</Badge>
              <Badge variant={getStatusBadgeVariant(itemView.status)}>{itemView.statusLabel}</Badge>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-app-soft">
                <AppIcon icon="location" className="text-[0.95em]" />
                <span>{itemView.location}</span>
              </span>
            </div>

            {itemView.status !== 'active' ? (
              <Card variant="subtle" className="space-y-2">
                <p className="text-sm font-semibold text-white">
                  {itemView.status === 'reserved'
                    ? 'This listing already has an accepted offer.'
                    : 'This listing is no longer available for new offers.'}
                </p>
                <p className="text-sm leading-7 text-app-soft">
                  You can still review the details and seller profile, but new offers are currently disabled.
                </p>
              </Card>
            ) : null}

            {!isOwner && isSignedIn ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    leadingIcon="offers"
                    onClick={() => setIsOfferComposerOpen((isOpen) => !isOpen)}
                    disabled={itemView.status !== 'active'}
                  >
                    {isOfferComposerOpen ? 'Hide offer form' : 'Make offer'}
                  </Button>
                  <Button variant="secondary" leadingIcon="message" onClick={handleStartConversation} loading={isStartingConversation}>
                    {isStartingConversation ? 'Opening chat...' : 'Message seller'}
                  </Button>
                  <Button
                    variant={favorite ? 'secondary' : 'ghost'}
                    leadingIcon="favorite"
                    onClick={toggleFavorite}
                    loading={isFavoritePending}
                  >
                    {favorite ? 'Favorited' : 'Favorite'}
                  </Button>
                </div>

                {isOfferComposerOpen ? (
                  <Card variant="subtle" className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                        Make an offer
                      </p>
                      <h2 className="text-2xl font-semibold text-white">Share your offer</h2>
                      <p className="text-sm leading-7 text-app-soft">
                        Add your price, payment method, and a campus meetup hub that works for you.
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleOfferSubmit}>
                      <Input
                        id="offer-price"
                        label="Your offer"
                        leadingIcon="payment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerValues.offeredPrice}
                        onChange={handleOfferFieldChange('offeredPrice')}
                        error={offerFieldErrors.offeredPrice}
                        placeholder="18"
                        required
                      />
                      <PickupHubPicker
                        id="offer-meetup-hub"
                        label="Proposed meetup hub"
                        description="Start from the seller's selected pickup hub or suggest another approved campus meetup spot."
                        selectedHubId={offerValues.meetupHubId}
                        onChange={handleMeetupHubChange}
                        error={offerFieldErrors.meetupHubId}
                        required
                      />
                      <Input
                        id="offer-meetup-window"
                        label="Meetup window"
                        leadingIcon="time"
                        value={offerValues.meetupWindow}
                        onChange={handleOfferFieldChange('meetupWindow')}
                        error={offerFieldErrors.meetupWindow}
                        placeholder="Tue 1:00 PM - 2:00 PM"
                        required
                      />
                      <Select
                        id="offer-payment-method"
                        label="Payment method"
                        leadingIcon="payment"
                        value={offerValues.paymentMethod}
                        onChange={handleOfferFieldChange('paymentMethod')}
                        error={offerFieldErrors.paymentMethod}
                        required
                      >
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Textarea
                        id="offer-message"
                        label="Optional note"
                        leadingIcon="message"
                        value={offerValues.message}
                        onChange={handleOfferFieldChange('message')}
                        placeholder="Can meet right after my lecture if that helps."
                        rows={4}
                      />

                      <Button type="submit" leadingIcon="send" loading={isSubmittingOffer}>
                        Send offer
                      </Button>
                    </form>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {!isSignedIn && !isOwner ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button leadingIcon="profile" onClick={() => navigate('/login')}>Log in to make offer</Button>
                <Button variant="secondary" leadingIcon="message" onClick={handleStartConversation}>
                  Message seller
                </Button>
              </div>
            ) : null}

            {submittedOffer ? (
              <Card variant="subtle" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                    Offer pending
                  </p>
                  <h2 className="text-xl font-semibold text-white">Your offer is waiting for the seller</h2>
                  <p className="text-sm leading-7 text-app-soft">
                    You can check its status in your offers inbox or continue the conversation with this seller.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/offers" className="no-underline">
                    <Button variant="secondary" leadingIcon="offers">Open offers inbox</Button>
                  </Link>
                  {submittedOffer.conversationId ? (
                    <Link to={`/messages/${submittedOffer.conversationId}`} className="no-underline">
                      <Button leadingIcon="messages">Open conversation</Button>
                    </Link>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {isOwner ? (
              <Button variant="danger" leadingIcon="delete" onClick={handleDelete} loading={isDeleting}>
                Delete listing
              </Button>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
              <AppIcon icon="seller" className="text-sm" />
              <span>Seller</span>
            </div>
            <Link
              to={`/profile/${itemView.seller.id}`}
              className="flex items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 no-underline transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <Avatar name={itemView.seller.name} src={itemView.seller.avatarUrl} size="lg" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-white">{itemView.seller.name}</p>
                  <Badge variant="orange" icon="rating">{trustMetrics.overallRatingLabel}</Badge>
                </div>
                <p className="text-sm text-app-soft">View seller profile and other listings</p>
              </div>
            </Link>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
                <AppIcon icon="rating" className="text-sm" />
                <span>Seller ratings</span>
              </div>
              <p className="text-sm leading-7 text-app-soft">
                See how past buyers rated this seller.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TrustMetricCard icon="reliability" label="Reliability" value={trustMetrics.reliabilityLabel} />
              <TrustMetricCard icon="accuracy" label="Accuracy" value={trustMetrics.accuracyLabel} />
              <TrustMetricCard icon="responsiveness" label="Responsiveness" value={trustMetrics.responsivenessLabel} />
              <TrustMetricCard icon="safety" label="Safety" value={trustMetrics.safetyLabel} />
            </div>

            {trustMetrics.totalRatings > 0 ? (
              <p className="text-xs uppercase tracking-[0.16em] text-app-muted">
                Based on {trustMetrics.totalRatings} completed rating{trustMetrics.totalRatings === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="text-xs uppercase tracking-[0.16em] text-app-muted">
                More ratings will show up here after future sales
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            <AppIcon icon="description" className="text-sm" />
            <span>Description</span>
          </div>
          <p className="text-base leading-8 text-app-soft">{itemView.description}</p>
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            <AppIcon icon="category" className="text-sm" />
            <span>Details</span>
          </div>
          <p className="text-base leading-8 text-app-soft">{itemView.details}</p>
        </Card>
      </div>
    </section>
  );
}
