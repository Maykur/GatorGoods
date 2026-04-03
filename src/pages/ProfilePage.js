import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import ItemCard from '../components/ProfilePage/ItemCard';
import {
  AppIcon,
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
import { getOffers } from '../lib/offersApi';
import { isMeetupScheduledToday } from '../lib/meetupSchedule';

const API_BASE_URL = 'http://localhost:5000';
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

function ProfileConnectorLinks({ profileHeader }) {
  const connectors = [
    profileHeader?.instagramUrl
      ? { id: 'instagram', label: 'Instagram', href: profileHeader.instagramUrl, icon: 'instagram' }
      : null,
    profileHeader?.linkedinUrl
      ? { id: 'linkedin', label: 'LinkedIn', href: profileHeader.linkedinUrl, icon: 'linkedin' }
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
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-soft no-underline transition hover:border-white/20 hover:text-white"
        >
          <AppIcon icon={connector.icon} className="text-[0.95em]" />
          {connector.label}
        </a>
      ))}
    </div>
  );
}

function ProfileStatCard({ icon, label, value }) {
  return (
    <Card variant="subtle" className="h-full min-w-[10.75rem] px-5 py-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
        <AppIcon icon={icon} className="text-sm" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function TrustMetricSurface({ icon, label, value, description }) {
  return (
    <Card variant="subtle" className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
        <AppIcon icon={icon} className="text-sm" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm leading-7 text-app-soft">{description}</p>
    </Card>
  );
}

export function ProfilePage({ ownerView = false }) {
  const { user, isSignedIn } = useUser();
  const { id } = useParams();
  const profileId = ownerView ? user?.id || '' : id;
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [ownerTodayTransactionOfferIdsByListingId, setOwnerTodayTransactionOfferIdsByListingId] = useState({});
  const [profileForm, setProfileForm] = useState(getEditableProfileValues(null));
  const [profileFormError, setProfileFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeActionId, setActiveActionId] = useState('');
  const [overlay, setOverlay] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!profileId) {
      throw new Error('Profile not found');
    }

    const profileResponse = await fetch(`${API_BASE_URL}/profile/${profileId}`);
    return readJson(profileResponse, 'Failed to load profile');
  }, [profileId]);

  useEffect(() => {
    let isMounted = true;

    if (!profileId) {
      setInfo(null);
      setOwnerTodayTransactionOfferIdsByListingId({});
      setError(ownerView ? 'Sign in to manage your profile.' : 'Profile not found');
      setIsLoading(false);
      return undefined;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const profileData = await loadProfile();
        let todayTransactionOfferIdsByListingId = {};

        if (ownerView && user?.id) {
          try {
            const sellerOffers = await getOffers({
              participantId: user.id,
              role: 'seller',
            });

            todayTransactionOfferIdsByListingId = sellerOffers.reduce((accumulator, offer) => {
              const listingId = offer?.listingId?.toString?.() || offer?.listingId || '';

              if (
                listingId &&
                offer?.sellerClerkUserId === user.id &&
                offer?.status === 'accepted' &&
                isMeetupScheduledToday(offer)
              ) {
                accumulator[listingId] = offer?._id || offer?.id || '';
              }

              return accumulator;
            }, {});
          } catch {
            todayTransactionOfferIdsByListingId = {};
          }
        }

        if (!isMounted) {
          return;
        }

        setInfo(profileData);
        setOwnerTodayTransactionOfferIdsByListingId(todayTransactionOfferIdsByListingId);
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setInfo(null);
          setOwnerTodayTransactionOfferIdsByListingId({});
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
  }, [loadProfile, ownerView, profileId, user?.id]);

  const profileHeader = useMemo(
    () => (info ? toProfileHeaderViewModel(info, info.listings, ownerView ? user?.id : null) : null),
    [info, ownerView, user?.id]
  );
  const trustMetrics = useMemo(() => toTrustMetricsViewModel(info), [info]);
  const listingItems = useMemo(
    () =>
      (info?.listings || []).map((listing) => {
        const listingView = toListingCardViewModel(listing);

        return {
          ...listingView,
          transactionOfferId: ownerView
            ? ownerTodayTransactionOfferIdsByListingId[listingView.id] || ''
            : '',
        };
      }),
    [info, ownerTodayTransactionOfferIdsByListingId, ownerView]
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
    const profileData = await loadProfile();
    setInfo(profileData);
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
	  setOverlay(false);
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
        icon={ownerView ? 'profile' : 'seller'}
        title={ownerView ? 'Manage your profile' : profileHeader?.displayName || 'Seller profile'}
        description={
          ownerView
            ? 'Update your photo, bio, links, and listings from one place.'
            : 'See this seller\'s bio, links, and ratings before you decide to buy.'
        }
        actions={
          ownerView ? (
            <Link to="/create" className="no-underline">
              <Button leadingIcon="createListing">Create listing</Button>
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
                      <Badge variant="orange" icon="rating">{trustMetrics.overallRatingLabel}</Badge>
                      {profileHeader.ufVerified ? <Badge variant="success" icon="verified">UF verified</Badge> : null}
                      {ownerView ? <Badge variant="info" icon="profile">Your profile</Badge> : null}
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

                <div className="grid items-stretch gap-3 sm:grid-cols-3 lg:gap-0">
                  <div className="h-full lg:relative lg:z-[1]">
                    <ProfileStatCard icon="listing" label="Active listings" value={profileHeader.listingCount} />
                  </div>
                  <div className="h-full lg:relative lg:z-[2] lg:-ml-2">
                    <ProfileStatCard icon="rating" label="Overall rating" value={trustMetrics.overallRatingLabel} />
                  </div>
                  <div className="h-full lg:relative lg:z-[3] lg:-ml-2">
                    <ProfileStatCard
                      icon={ownerView ? 'favorite' : 'verified'}
                      label={ownerView ? 'Favorites' : 'Ratings logged'}
                      value={ownerView ? profileHeader.favoritesCount : trustMetrics.totalRatings}
                    />
                  </div>
                </div>
              </div>
			  {ownerView && !overlay ? (
				<Button onClick={() => setOverlay(true)}>
					Edit Profile
				</Button>
			  ): null}
            </div>
          </Card>

		{ownerView && overlay ? (
            <Card className="space-y-6">
				<Button onClick={() => setOverlay(false)}>
					Exit
				</Button>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                  <AppIcon icon="profile" className="text-sm" />
                  <span>Edit your public profile</span>
                </div>
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
                    leadingIcon="profile"
                    value={profileForm.profileName}
                    onChange={handleProfileFieldChange('profileName')}
                    required
                  />
                  <Input
                    id="profile-picture"
                    label="Profile image URL"
                    leadingIcon="seller"
                    value={profileForm.profilePicture}
                    onChange={handleProfileFieldChange('profilePicture')}
                    placeholder="https://..."
                  />
                </div>
                <Input
                  id="profile-banner"
                  label="Banner image URL"
                  leadingIcon="open"
                  value={profileForm.profileBanner}
                  onChange={handleProfileFieldChange('profileBanner')}
                  placeholder="https://..."
                />
                <Textarea
                  id="profile-bio"
                  label="Short bio"
                  leadingIcon="message"
                  value={profileForm.profileBio}
                  onChange={handleProfileFieldChange('profileBio')}
                  rows={4}
                  placeholder="Selling a few campus essentials and always meeting in public spots."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="profile-instagram"
                    label="Instagram URL"
                    leadingIcon="instagram"
                    value={profileForm.instagramUrl}
                    onChange={handleProfileFieldChange('instagramUrl')}
                    placeholder="https://instagram.com/..."
                  />
                  <Input
                    id="profile-linkedin"
                    label="LinkedIn URL"
                    leadingIcon="linkedin"
                    value={profileForm.linkedinUrl}
                    onChange={handleProfileFieldChange('linkedinUrl')}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <Button type="submit" leadingIcon="verified" loading={isSavingProfile}>
                  Save profile changes
                </Button>
              </form>
            </Card>
          ) : null}
		  
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TrustMetricSurface icon="reliability" label="Reliability" value={trustMetrics.reliabilityLabel} description="Do they usually show up when they say they will?" />
            <TrustMetricSurface icon="accuracy" label="Accuracy" value={trustMetrics.accuracyLabel} description="Did the item match the listing?" />
            <TrustMetricSurface icon="responsiveness" label="Responsiveness" value={trustMetrics.responsivenessLabel} description="How quickly did they reply?" />
            <TrustMetricSurface icon="safety" label="Safety" value={trustMetrics.safetyLabel} description="Did the meetup feel comfortable and straightforward?" />
          </div>

          {ownerView ? (
            <Card className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                    <AppIcon icon="listing" className="text-sm" />
                    <span>Active listings</span>
                  </div>
                  <p className="text-sm leading-7 text-app-soft">
                    Manage your current listings.
                  </p>
                </div>
                <Link to="/favorites" className="no-underline">
                  <Button variant="secondary" leadingIcon="favorite">Open favorites</Button>
                </Link>
              </div>

              {listingItems.length > 0 ? (
                <ItemCard
                  items={listingItems}
                  isOwner
                  deletingListingId={activeActionId.replace('delete-', '')}
                  onDelete={handleDeleteListing}
                />
              ) : (
                <EmptyState
                  icon="createListing"
                  title="No active listings yet"
                  description="Create your first listing to start selling around campus."
                  action={
                    <Link to="/create" className="no-underline">
                      <Button leadingIcon="createListing">Create listing</Button>
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
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                  <AppIcon icon="rating" className="text-sm" />
                  <span>Leave feedback</span>
                </div>
                <h2 className="text-2xl font-semibold text-white">Rate this seller</h2>
                <p className="text-sm leading-7 text-app-soft">
                  Share a quick rating after your purchase.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleReviewSubmit}>
                <Select
                  id="review-score"
                  label="Review rating"
                  leadingIcon="rating"
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

                <Button type="submit" leadingIcon="verified" loading={isSubmittingReview}>
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
