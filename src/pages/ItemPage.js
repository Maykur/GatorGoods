import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { createConversation } from '../lib/messagesApi';
import { toListingDetailViewModel } from '../lib/viewModels';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBanner,
  PageHeader,
  Skeleton,
  useConfirmDialog,
  useToast,
} from '../components/ui';

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

export function ItemPage() {
  const { user, isSignedIn } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [item, setItem] = useState(null);
  const [favorite, setFav] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [error, setError] = useState('');

  const itemView = useMemo(
    () => (item ? toListingDetailViewModel(item, user?.id || null) : null),
    [item, user?.id]
  );
  const isOwner = Boolean(itemView?.isOwner);

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

  if (isLoading) {
    return <LoadingState />;
  }

  if (!itemView) {
    return (
      <section className="w-full space-y-4">
        <Link to="/listings" className="text-sm font-semibold text-app-soft no-underline hover:text-white">
          Back to listings
        </Link>
        <ErrorBanner title="We couldn't open this listing" message={error || 'The requested item could not be loaded.'} />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <Link to="/listings" className="inline-flex text-sm font-semibold text-app-soft no-underline transition-colors hover:text-white">
        Back to listings
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
              title={itemView.title}
              description="Message the seller, save the listing, or review the item details before you meet up on campus."
            />

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-4xl font-semibold tracking-tight text-gatorOrange">
                {itemView.priceLabel}
              </p>
              <Badge condition={itemView.condition}>{itemView.condition}</Badge>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-app-soft">
                {itemView.location}
              </span>
            </div>

            {!isOwner && isSignedIn ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant={favorite ? 'secondary' : 'ghost'}
                  onClick={toggleFavorite}
                  loading={isFavoritePending}
                >
                  {favorite ? 'Favorited' : 'Favorite'}
                </Button>
                <Button onClick={handleStartConversation} loading={isStartingConversation}>
                  {isStartingConversation ? 'Opening chat...' : 'Message seller'}
                </Button>
              </div>
            ) : null}

            {!isSignedIn && !isOwner ? (
              <Button onClick={handleStartConversation}>Log in to message seller</Button>
            ) : null}

            {isOwner ? (
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Delete listing
              </Button>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
              Seller
            </p>
            <Link
              to={`/profile/${itemView.seller.id}`}
              className="flex items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 no-underline transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <Avatar name={itemView.seller.name} src={itemView.seller.avatarUrl} size="lg" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-white">{itemView.seller.name}</p>
                <p className="text-sm text-app-soft">View seller profile and active listings</p>
              </div>
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            Description
          </p>
          <p className="text-base leading-8 text-app-soft">{itemView.description}</p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            Details
          </p>
          <p className="text-base leading-8 text-app-soft">{itemView.details}</p>
        </Card>
      </div>
    </section>
  );
}
