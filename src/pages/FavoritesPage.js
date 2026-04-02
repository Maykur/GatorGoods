import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import FavCard from '../components/ProfilePage/FavCard';
import {
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
  useConfirmDialog,
  useToast,
} from '../components/ui';
import { toListingCardViewModel } from '../lib/viewModels';

const API_BASE_URL = 'http://localhost:5000';

function FavoritesSkeleton() {
  return (
    <section className="w-full space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-32 rounded-[1.5rem]" />
      <Skeleton className="h-32 rounded-[1.5rem]" />
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

export function FavoritesPage() {
  const { user } = useUser();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState('');

  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      throw new Error('Sign in to view your favorites.');
    }

    const profileResponse = await fetch(`${API_BASE_URL}/profile/${user.id}`);
    const profileData = await readJson(profileResponse, 'Failed to load favorites');
    const favoriteIds = Array.isArray(profileData.profile?.profileFavorites)
      ? profileData.profile.profileFavorites
      : [];
    const favoriteResults = await Promise.allSettled(favoriteIds.map(fetchOptionalItem));

    return favoriteResults
      .map((result) => (result.status === 'fulfilled' ? result.value : null))
      .filter(Boolean);
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const favorites = await loadFavorites();

        if (!isMounted) {
          return;
        }

        setFavoriteItems(favorites);
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setFavoriteItems([]);
          setError(loadError.message || 'Failed to load favorites');
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
  }, [loadFavorites]);

  const favoriteCards = useMemo(
    () =>
      favoriteItems.map((item) => ({
        ...toListingCardViewModel(item),
        sellerId: item.userPublishingID || '',
      })),
    [favoriteItems]
  );

  const handleRemoveFavorite = useCallback(
    async (listingId, listingTitle) => {
      if (!user?.id) {
        return;
      }

      const shouldRemove = await confirm({
        title: 'Remove this favorite?',
        description: `Take ${listingTitle} out of your saved listings.`,
        confirmLabel: 'Remove favorite',
      });

      if (!shouldRemove) {
        return;
      }

      try {
        setActiveActionId(`favorite-${listingId}`);
        const response = await fetch(`${API_BASE_URL}/user/${user.id}/fav/${listingId}`, {
          method: 'DELETE',
        });
        await readJson(response, 'Failed to remove favorite');
        const refreshedFavorites = await loadFavorites();
        setFavoriteItems(refreshedFavorites);
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
    [confirm, loadFavorites, showToast, user?.id]
  );

  if (isLoading) {
    return <FavoritesSkeleton />;
  }

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Favorites"
        icon="favorite"
        title="Your saved items"
        description="Keep quick access to listings you want to revisit, compare, or message about later."
        actions={
          <Link to="/listings" className="no-underline">
            <Button variant="secondary" size="sm" leadingIcon="browse">
              Browse listings
            </Button>
          </Link>
        }
      />

      {error ? (
        <ErrorBanner
          title="We couldn't load your favorites"
          message={`${error}. Refresh and try again in a moment.`}
        />
      ) : null}

      {!error && favoriteCards.length > 0 ? (
        <FavCard
          items={favoriteCards}
          removingListingId={activeActionId.replace('favorite-', '')}
          onRemoveFavorite={handleRemoveFavorite}
        />
      ) : null}

      {!error && favoriteCards.length === 0 ? (
        <EmptyState
          icon="favorite"
          title="No favorites saved yet"
          description="Save listings you want to revisit and they will show up here."
          action={
            <Link to="/listings" className="no-underline">
              <Button variant="secondary" leadingIcon="browse">Browse listings</Button>
            </Link>
          }
        />
      ) : null}
    </section>
  );
}
