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

function readImageFile(file, { maxSizeMb = 5 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Choose an image to upload.'));
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      reject(new Error(`Choose an image under ${maxSizeMb} MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read that image. Try a different file.'));
    reader.readAsDataURL(file);
  });
}

function normalizeProfileImageValue(value) {
  return typeof value === 'string' ? value.trim() : '';
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
      setError(ownerView ? 'Sign in to manage your profile.' : 'Profile not found');
      setIsLoading(false);
      return undefined;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const profileData = await loadProfile();

        if (!isMounted) {
          return;
        }

        setInfo(profileData);
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setInfo(null);
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

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextProfilePicture = await readImageFile(file);
      setProfileForm((currentForm) => ({
        ...currentForm,
        profilePicture: nextProfilePicture,
      }));
      setProfileFormError('');
    } catch (uploadError) {
      setProfileFormError(uploadError.message || 'Unable to use that profile image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextBanner = await readImageFile(file);
      setProfileForm((currentForm) => ({
        ...currentForm,
        profileBanner: nextBanner,
      }));
      setProfileFormError('');
    } catch (uploadError) {
      setProfileFormError(uploadError.message || 'Unable to use that banner image.');
    } finally {
      event.target.value = '';
    }
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
      const nextProfilePayload = {
        ...profileForm,
      };
      const currentProfilePicture = normalizeProfileImageValue(profileHeader?.avatarUrl);
      const nextProfilePicture = normalizeProfileImageValue(profileForm.profilePicture);

      if (ownerView && user?.setProfileImage && nextProfilePicture !== currentProfilePicture) {
        const imageResource = await user.setProfileImage({
          file: nextProfilePicture || null,
        });

        if (typeof user.reload === 'function') {
          await user.reload();
        }

        nextProfilePayload.profilePicture = imageResource?.publicUrl || '';
      }

      const response = await fetch(`${API_BASE_URL}/user/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextProfilePayload),
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
        title={ownerView ? 'Your profile' : profileHeader?.displayName || 'Seller profile'}
        description={
          ownerView
            ? 'Update your display name, profile photo, banner, bio, and listings here.'
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
            <div className="space-y-4 p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="self-start">
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
                          ? 'Add a short description about yourself.'
                          : 'This seller has not added a bio yet.')}
                    </p>

                    <ProfileConnectorLinks profileHeader={profileHeader} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
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
                  {ownerView && !overlay ? (
                    <div className="-mt-1 flex justify-start lg:justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        className="min-h-9 px-3"
                        onClick={() => setOverlay(true)}
                        aria-label="Edit profile"
                        title="Edit profile"
                      >
                        <AppIcon icon="edit" className="text-sm" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

		{ownerView && overlay ? (
            <Card className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                    <AppIcon icon="edit" className="text-sm" />
                    <span>Edit your profile</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Refresh what people see before they message you</h2>
                  <p className="text-sm leading-7 text-app-soft">
                    Update your display name, profile photo, banner, bio, and public links here.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setOverlay(false)}>
                  Close
                </Button>
              </div>

              {profileFormError ? (
                <ErrorBanner title="We couldn't save your profile" message={profileFormError} />
              ) : null}

              <form className="space-y-4" onSubmit={handleProfileSave}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <Card variant="subtle" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                        <AppIcon icon="profile" className="text-sm" />
                        <span>Profile identity</span>
                      </div>
                      <p className="text-sm leading-7 text-app-soft">
                        Change the name and photo shown around the marketplace. The profile button in the top right can also be used for account-level updates.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Avatar
                        src={profileForm.profilePicture}
                        alt={profileForm.profileName || 'Profile preview'}
                        name={profileForm.profileName || 'Profile preview'}
                        size="lg"
                      />
                      <div className="flex-1 space-y-4">
                        <Input
                          id="profile-name"
                          label="Display name"
                          leadingIcon="profile"
                          value={profileForm.profileName}
                          onChange={handleProfileFieldChange('profileName')}
                          required
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <label
                            htmlFor="profile-picture-upload"
                            className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-app-surface/70 px-5 text-sm font-semibold tracking-tight text-app-text transition-all duration-200 hover:border-white/20 hover:bg-app-elevated/90"
                          >
                            <AppIcon icon="uploadPhoto" className="text-[0.95em]" />
                            <span>Upload profile photo</span>
                            <input
                              id="profile-picture-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePictureUpload}
                              className="sr-only"
                            />
                          </label>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setProfileForm((currentForm) => ({
                                ...currentForm,
                                profilePicture: '',
                              }));
                              setProfileFormError('');
                            }}
                          >
                            Remove photo
                          </Button>
                        </div>
                        <Input
                          id="profile-picture"
                          label="Profile photo URL"
                          leadingIcon="seller"
                          value={profileForm.profilePicture}
                          onChange={handleProfileFieldChange('profilePicture')}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </Card>

                  <Card variant="subtle" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                        <AppIcon icon="uploadPhoto" className="text-sm" />
                        <span>Banner image</span>
                      </div>
                      <p className="text-sm leading-7 text-app-soft">
                        Upload a banner image or paste an image URL. Wide images work best here.
                      </p>
                    </div>
                    <div
                      className="min-h-[9rem] rounded-[1.5rem] border border-white/10 bg-gradient-to-r from-brand-blue/25 via-app-surface to-gatorOrange/20"
                      style={profileForm.profileBanner ? { backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.28), rgba(2, 6, 23, 0.6)), url(${profileForm.profileBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label
                        htmlFor="profile-banner-upload"
                        className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-app-surface/70 px-5 text-sm font-semibold tracking-tight text-app-text transition-all duration-200 hover:border-white/20 hover:bg-app-elevated/90"
                      >
                        <AppIcon icon="uploadPhoto" className="text-[0.95em]" />
                        <span>Upload banner image</span>
                        <input
                          id="profile-banner-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="sr-only"
                        />
                      </label>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setProfileForm((currentForm) => ({
                            ...currentForm,
                            profileBanner: '',
                          }));
                          setProfileFormError('');
                        }}
                      >
                        Remove banner
                      </Button>
                    </div>
                    <Input
                      id="profile-banner"
                      label="Banner image URL"
                      leadingIcon="open"
                      value={profileForm.profileBanner}
                      onChange={handleProfileFieldChange('profileBanner')}
                      placeholder="https://..."
                    />
                  </Card>
                </div>
                <Textarea
                  id="profile-bio"
                  label="Profile bio"
                  leadingIcon="message"
                  value={profileForm.profileBio}
                  onChange={handleProfileFieldChange('profileBio')}
                  rows={5}
                  placeholder="Add a short description about yourself."
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
                    Manage what you currently have posted.
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
