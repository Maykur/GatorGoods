import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import ItemCard from '../components/ProfilePage/ItemCard';
import FavCard from '../components/ProfilePage/FavCard';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  Skeleton,
  useConfirmDialog,
  useToast,
} from '../components/ui';
import { toListingCardViewModel, toProfileHeaderViewModel } from '../lib/viewModels';

const API_BASE_URL = 'http://localhost:5000';
const OWNER_TABS = [
  { id: 'listings', label: 'Active listings' },
  { id: 'favorites', label: 'Favorites' },
];
const REVIEW_OPTIONS = ['0', '1', '2', '3', '4', '5'];

function ProfileSkeleton() {
  return (
    <section className="w-full space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      <Card className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Skeleton className="h-24 w-24 rounded-[1.5rem]" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-6 w-40" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-12 w-36 rounded-2xl" />
              <Skeleton className="h-12 w-36 rounded-2xl" />
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <Skeleton className="h-32 w-full rounded-[1.5rem] sm:w-40" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-7 w-full max-w-sm" />
              <Skeleton className="h-5 w-40" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }

  return data;
}

async function fetchOptionalItem(itemId) {
  if (!itemId) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}`);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

export function ProfilePage({ ownerView = false }) {
  const { user, isSignedIn } = useUser();
  const { id } = useParams();
  const profileId = ownerView ? user?.id || '' : id;
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [info, setInfo] = useState(null);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [activeTab, setActiveTab] = useState('listings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeActionId, setActiveActionId] = useState('');

  const loadProfile = useCallback(async () => {
    if (!profileId) {
      throw new Error('Profile not found');
    }

    const profileResponse = await fetch(`${API_BASE_URL}/profile/${profileId}`);
    const profileData = await readJson(profileResponse, 'Failed to load profile');

    if (!ownerView) {
      return {
        profileData,
        favorites: [],
      };
    }

    const favoriteIds = Array.isArray(profileData.profile?.profileFavorites)
      ? profileData.profile.profileFavorites
      : [];
    const favoriteResults = await Promise.allSettled(favoriteIds.map(fetchOptionalItem));

    return {
      profileData,
      favorites: favoriteResults
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean),
    };
  }, [ownerView, profileId]);

  useEffect(() => {
    let isMounted = true;

    if (!profileId) {
      setInfo(null);
      setFavoriteItems([]);
      setError(ownerView ? 'Sign in to manage your profile dashboard.' : 'Profile not found');
      setIsLoading(false);
      return undefined;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const { profileData, favorites } = await loadProfile();

        if (!isMounted) {
          return;
        }

        setInfo(profileData);
        setFavoriteItems(favorites);
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setInfo(null);
          setFavoriteItems([]);
          setError(loadError.message || 'Failed to load profile');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [loadProfile, ownerView, profileId]);

  const profileHeader = useMemo(
    () => (info ? toProfileHeaderViewModel(info, info.listings, ownerView ? user?.id : null) : null),
    [info, ownerView, user?.id]
  );
  const listingItems = useMemo(
    () => (info?.listings || []).map(toListingCardViewModel),
    [info]
  );
  const favoriteCards = useMemo(
    () =>
      favoriteItems.map((item) => ({
        ...toListingCardViewModel(item),
        sellerId: item.userPublishingID || '',
      })),
    [favoriteItems]
  );
  const canReview = Boolean(
    !ownerView &&
      isSignedIn &&
      user?.id &&
      info?.profile?.profileID &&
      info.profile.profileID !== user.id
  );

  const refreshProfile = useCallback(async () => {
    const { profileData, favorites } = await loadProfile();
    setInfo(profileData);
    setFavoriteItems(favorites);
  }, [loadProfile]);

  const handleDeleteListing = useCallback(
    async (listingId, listingTitle) => {
      const shouldDelete = await confirm({
        title: 'Delete this listing?',
        description: `Remove ${listingTitle} from the marketplace. This cannot be undone.`,
        confirmLabel: 'Delete listing',
      });

      if (!shouldDelete) {
        return;
      }

      try {
        setActiveActionId(`delete-${listingId}`);
        const response = await fetch(`${API_BASE_URL}/item/${listingId}`, {
          method: 'DELETE',
        });
        await readJson(response, 'Failed to delete listing');
        await refreshProfile();
        showToast({
          title: 'Listing deleted',
          description: `${listingTitle} has been removed from your active listings.`,
          variant: 'success',
        });
      } catch (deleteError) {
        showToast({
          title: 'Unable to delete listing',
          description: deleteError.message || 'Try again in a moment.',
          variant: 'danger',
        });
      } finally {
        setActiveActionId('');
      }
    },
    [confirm, refreshProfile, showToast]
  );

  const handleRemoveFavorite = useCallback(
    async (listingId, listingTitle) => {
      const shouldRemove = await confirm({
        title: 'Remove this favorite?',
        description: `Take ${listingTitle} out of your saved listings.`,
        confirmLabel: 'Remove favorite',
      });

      if (!shouldRemove || !profileId) {
        return;
      }

      try {
        setActiveActionId(`favorite-${listingId}`);
        const response = await fetch(`${API_BASE_URL}/user/${profileId}/fav/${listingId}`, {
          method: 'DELETE',
        });
        await readJson(response, 'Failed to remove favorite');
        await refreshProfile();
        showToast({
          title: 'Favorite removed',
          description: `${listingTitle} is no longer saved in your dashboard.`,
          variant: 'success',
        });
      } catch (favoriteError) {
        showToast({
          title: 'Unable to update favorites',
          description: favoriteError.message || 'Try again in a moment.',
          variant: 'danger',
        });
      } finally {
        setActiveActionId('');
      }
    },
    [confirm, profileId, refreshProfile, showToast]
  );

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!reviewScore) {
      setReviewError('Choose a review score before submitting.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      const response = await fetch(`${API_BASE_URL}/update_score/${profileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewScore: Number(reviewScore),
        }),
      });
      const updatedProfile = await readJson(response, 'Unable to submit review');

      setInfo((currentInfo) =>
        currentInfo
          ? {
              profile: updatedProfile,
              listings: currentInfo.listings || [],
            }
          : currentInfo
      );
      setReviewScore('');
      setReviewError('');
      showToast({
        title: 'Review submitted',
        description: 'Thanks for leaving seller feedback.',
        variant: 'success',
      });
    } catch (submitError) {
      setReviewError(submitError.message || 'Unable to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow={ownerView ? 'Owner Dashboard' : 'Seller Profile'}
        title={ownerView ? 'Manage your seller presence' : profileHeader?.displayName || 'Seller profile'}
        description={
          ownerView
            ? 'Review active listings, keep track of favorites, and make sure your marketplace presence stays current.'
            : 'View seller reputation, current listings, and leave a quick review after a transaction.'
        }
        actions={
          ownerView ? (
            <Link to="/create" className="no-underline">
              <Button>Create listing</Button>
            </Link>
          ) : null
        }
      />

      {error ? (
        <ErrorBanner
          title="We couldn't load this profile"
          message={`${error}. Refresh and try again in a moment.`}
        />
      ) : null}

      {!error && profileHeader ? (
        <>
          <Card className="space-y-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar
                  src={profileHeader.avatarUrl}
                  alt={profileHeader.displayName}
                  name={profileHeader.displayName}
                  size="xl"
                />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {profileHeader.displayName}
                    </h1>
                    <Badge variant="orange">{profileHeader.ratingLabel}</Badge>
                    {ownerView ? <Badge variant="info">Owner dashboard</Badge> : null}
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-app-soft">
                    {ownerView
                      ? 'Your dashboard keeps listing management and saved items in one place.'
                      : 'This public seller view keeps current listings and reputation visible before you start a conversation.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card variant="subtle" className="min-w-[11rem]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                    Active listings
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">{profileHeader.listingCount}</p>
                </Card>
                <Card variant="subtle" className="min-w-[11rem]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                    {ownerView ? 'Favorites' : 'Seller rating'}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {ownerView ? profileHeader.favoritesCount : profileHeader.ratingLabel}
                  </p>
                </Card>
              </div>
            </div>
          </Card>

          {ownerView ? (
            <Card className="space-y-6">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Profile content sections">
                {OWNER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'border-gatorOrange/50 bg-gatorOrange/15 text-white'
                        : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'listings' ? (
                listingItems.length > 0 ? (
                  <ItemCard
                    items={listingItems}
                    isOwner
                    deletingListingId={activeActionId.replace('delete-', '')}
                    onDelete={handleDeleteListing}
                  />
                ) : (
                  <EmptyState
                    title="No active listings yet"
                    description="Create your first listing to start selling around campus."
                    action={
                      <Link to="/create" className="no-underline">
                        <Button>Create listing</Button>
                      </Link>
                    }
                  />
                )
              ) : favoriteCards.length > 0 ? (
                <FavCard
                  items={favoriteCards}
                  removingListingId={activeActionId.replace('favorite-', '')}
                  onRemoveFavorite={handleRemoveFavorite}
                />
              ) : (
                <EmptyState
                  title="No favorites saved yet"
                  description="Save listings you want to revisit and they will show up here."
                  action={
                    <Link to="/listings" className="no-underline">
                      <Button variant="secondary">Browse listings</Button>
                    </Link>
                  }
                />
              )}
            </Card>
          ) : (
            <ItemCard
              items={listingItems}
              emptyTitle="No active listings right now"
              emptyDescription="This seller does not have any live listings at the moment."
            />
          )}

          {canReview ? (
            <Card className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                  Leave feedback
                </p>
                <h2 className="text-2xl font-semibold text-white">Rate this seller</h2>
                <p className="text-sm leading-7 text-app-soft">
                  Share a quick score after a completed purchase so future buyers have better context.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleReviewSubmit}>
                <Select
                  id="review-score"
                  label="Review rating"
                  value={reviewScore}
                  onChange={(event) => {
                    setReviewScore(event.target.value);
                    if (reviewError) {
                      setReviewError('');
                    }
                  }}
                  error={reviewError}
                >
                  <option value="">Select a score</option>
                  {REVIEW_OPTIONS.map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </Select>

                <Button type="submit" loading={isSubmittingReview}>
                  Submit review score
                </Button>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
