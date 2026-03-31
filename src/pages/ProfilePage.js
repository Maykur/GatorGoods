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
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useConfirmDialog,
  useToast,
} from '../components/ui';
import {
  toListingCardViewModel,
  toProfileHeaderViewModel,
  toTrustMetricsViewModel,
} from '../lib/viewModels';

const API_BASE_URL = 'http://localhost:5000';
const OWNER_TABS = [
  { id: 'listings', label: 'Active listings' },
  { id: 'favorites', label: 'Favorites' },
];
const REVIEW_OPTIONS = ['0', '1', '2', '3', '4', '5'];

function getEditableProfileValues(profileHeader) {
  return {
    profileName: profileHeader?.displayName || '',
    profilePicture: profileHeader?.avatarUrl || '',
    profileBanner: profileHeader?.bannerUrl || '',
    profileBio: profileHeader?.bio || '',
    instagramUrl: profileHeader?.instagramUrl || '',
    linkedinUrl: profileHeader?.linkedinUrl || '',
  };
}

function ProfileSkeleton() {
  return (
    <section className="w-full space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <Skeleton className="h-40 rounded-none" />
        <div className="space-y-6 p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <Skeleton className="h-24 w-24 rounded-[1.5rem]" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-full max-w-2xl" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[1.5rem]" />
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

function ProfileConnectorLinks({ profileHeader }) {
  const connectors = [
    profileHeader?.instagramUrl
      ? { id: 'instagram', label: 'Instagram', href: profileHeader.instagramUrl }
      : null,
    profileHeader?.linkedinUrl
      ? { id: 'linkedin', label: 'LinkedIn', href: profileHeader.linkedinUrl }
      : null,
  ].filter(Boolean);

  if (connectors.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((connector) => (
        <a
          key={connector.id}
          href={connector.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-soft no-underline transition hover:border-white/20 hover:text-white"
        >
          {connector.label}
        </a>
      ))}
    </div>
  );
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
  const [profileForm, setProfileForm] = useState(getEditableProfileValues(null));
  const [profileFormError, setProfileFormError] = useState('');
  const [activeTab, setActiveTab] = useState('listings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
      setError(ownerView ? 'Sign in to manage your profile.' : 'Profile not found');
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
  const trustMetrics = useMemo(() => toTrustMetricsViewModel(info), [info]);
  const listingItems = useMemo(() => (info?.listings || []).map(toListingCardViewModel), [info]);
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

  useEffect(() => {
    if (!ownerView || !profileHeader) {
      return;
    }

    setProfileForm(getEditableProfileValues(profileHeader));
    setProfileFormError('');
  }, [ownerView, profileHeader]);

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
          description: `${listingTitle} is no longer in your saved items.`,
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

  const handleProfileFieldChange = (field) => (event) => {
    setProfileForm((currentForm) => ({
      ...currentForm,
      [field]: event.target.value,
    }));
    setProfileFormError('');
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (!profileId) {
      return;
    }

    if (!profileForm.profileName.trim()) {
      setProfileFormError('Display name is required.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const response = await fetch(`${API_BASE_URL}/user/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });
      const updatedProfile = await readJson(response, 'Unable to save profile changes');

      setInfo((currentInfo) =>
        currentInfo
          ? {
              ...currentInfo,
              profile: updatedProfile,
            }
          : currentInfo
      );
      setProfileFormError('');
      showToast({
        title: 'Profile updated',
        description: 'Your public seller profile is now up to date.',
        variant: 'success',
      });
    } catch (saveError) {
      setProfileFormError(saveError.message || 'Unable to save profile changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow={ownerView ? 'Your Profile' : 'Seller Profile'}
        title={ownerView ? 'Manage your profile' : profileHeader?.displayName || 'Seller profile'}
        description={
          ownerView
            ? 'Update your photo, bio, links, listings, and saved items in one place.'
            : 'See this seller\'s bio, links, and ratings before you decide to buy.'
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
          <Card padding="none" className="overflow-hidden">
            <div
              className="min-h-[11rem] border-b border-white/10 bg-gradient-to-r from-brand-blue/25 via-app-surface to-gatorOrange/20"
              style={profileHeader.bannerUrl ? { backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.35), rgba(2, 6, 23, 0.7)), url(${profileHeader.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            <div className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                  <div className="-mt-16 sm:-mt-20">
                    <Avatar
                      src={profileHeader.avatarUrl}
                      alt={profileHeader.displayName}
                      name={profileHeader.displayName}
                      size="xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        {profileHeader.displayName}
                      </h1>
                      <Badge variant="orange">{trustMetrics.overallRatingLabel}</Badge>
                      {profileHeader.ufVerified ? <Badge variant="success">UF verified</Badge> : null}
                      {ownerView ? <Badge variant="info">Your profile</Badge> : null}
                    </div>

                    <p className="max-w-2xl text-sm leading-7 text-app-soft">
                      {profileHeader.bio ||
                        (ownerView
                          ? 'Add a short bio so people know what you usually sell.'
                          : 'This seller has not added a bio yet.')}
                    </p>

                    <ProfileConnectorLinks profileHeader={profileHeader} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Card variant="subtle" className="min-w-[10rem]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Active listings
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">{profileHeader.listingCount}</p>
                  </Card>
                  <Card variant="subtle" className="min-w-[10rem]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      Overall rating
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">{trustMetrics.overallRatingLabel}</p>
                  </Card>
                  <Card variant="subtle" className="min-w-[10rem]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      {ownerView ? 'Favorites' : 'Ratings logged'}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {ownerView ? profileHeader.favoritesCount : trustMetrics.totalRatings}
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card variant="subtle" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Reliability</p>
              <p className="text-2xl font-semibold text-white">{trustMetrics.reliabilityLabel}</p>
              <p className="text-sm leading-7 text-app-soft">Do they usually show up when they say they will?</p>
            </Card>
            <Card variant="subtle" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Accuracy</p>
              <p className="text-2xl font-semibold text-white">{trustMetrics.accuracyLabel}</p>
              <p className="text-sm leading-7 text-app-soft">Did the item match the listing?</p>
            </Card>
            <Card variant="subtle" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Responsiveness</p>
              <p className="text-2xl font-semibold text-white">{trustMetrics.responsivenessLabel}</p>
              <p className="text-sm leading-7 text-app-soft">How quickly did they reply?</p>
            </Card>
            <Card variant="subtle" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Safety</p>
              <p className="text-2xl font-semibold text-white">{trustMetrics.safetyLabel}</p>
              <p className="text-sm leading-7 text-app-soft">Did the meetup feel comfortable and straightforward?</p>
            </Card>
          </div>

          {ownerView ? (
            <Card className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                  Edit your public profile
                </p>
                <h2 className="text-2xl font-semibold text-white">Update what people see on your profile</h2>
                <p className="text-sm leading-7 text-app-soft">
                  Add a recognizable photo, a short bio, and any public links you want to share.
                </p>
              </div>

              {profileFormError ? (
                <ErrorBanner title="We couldn't save your profile" message={profileFormError} />
              ) : null}

              <form className="space-y-4" onSubmit={handleProfileSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="profile-name"
                    label="Display name"
                    value={profileForm.profileName}
                    onChange={handleProfileFieldChange('profileName')}
                    required
                  />
                  <Input
                    id="profile-picture"
                    label="Profile image URL"
                    value={profileForm.profilePicture}
                    onChange={handleProfileFieldChange('profilePicture')}
                    placeholder="https://..."
                  />
                </div>
                <Input
                  id="profile-banner"
                  label="Banner image URL"
                  value={profileForm.profileBanner}
                  onChange={handleProfileFieldChange('profileBanner')}
                  placeholder="https://..."
                />
                <Textarea
                  id="profile-bio"
                  label="Short bio"
                  value={profileForm.profileBio}
                  onChange={handleProfileFieldChange('profileBio')}
                  rows={4}
                  placeholder="Selling a few campus essentials and always meeting in public spots."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="profile-instagram"
                    label="Instagram URL"
                    value={profileForm.instagramUrl}
                    onChange={handleProfileFieldChange('instagramUrl')}
                    placeholder="https://instagram.com/..."
                  />
                  <Input
                    id="profile-linkedin"
                    label="LinkedIn URL"
                    value={profileForm.linkedinUrl}
                    onChange={handleProfileFieldChange('linkedinUrl')}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <Button type="submit" loading={isSavingProfile}>
                  Save profile changes
                </Button>
              </form>
            </Card>
          ) : null}

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
                  Share a quick rating after your purchase.
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
