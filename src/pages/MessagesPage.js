import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '../components/ui';
import { getConversations } from '../lib/messagesApi';
import { toConversationPreviewViewModel } from '../lib/viewModels';

const API_BASE_URL = 'http://localhost:5000';

function ConversationsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-full" />
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

export function MessagesPage() {
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadConversations = async (showLoadingState = true) => {
      if (!user?.id) {
        return;
      }

      const profileCache = new Map();
      const listingCache = new Map();

      try {
        if (showLoadingState) {
          setIsLoading(true);
        } else if (isMounted) {
          setIsRefreshing(true);
        }

        const conversationData = await getConversations(user.id);
        const enrichedConversations = await Promise.all(
          conversationData.map(async (conversation) => {
            const otherParticipantId = conversation.participantIds.find(
              (participantId) => participantId !== user.id
            );
            const profilePromise = otherParticipantId
              ? profileCache.get(otherParticipantId) ||
                fetchOptionalJson(`${API_BASE_URL}/profile/${otherParticipantId}`)
              : Promise.resolve(null);
            const listingKey = conversation.activeListingId?.toString?.() || '';
            const listingPromise = listingKey
              ? listingCache.get(listingKey) || fetchOptionalJson(`${API_BASE_URL}/items/${listingKey}`)
              : Promise.resolve(null);

            if (otherParticipantId && !profileCache.has(otherParticipantId)) {
              profileCache.set(otherParticipantId, profilePromise);
            }

            if (listingKey && !listingCache.has(listingKey)) {
              listingCache.set(listingKey, listingPromise);
            }

            const [profileData, listingData] = await Promise.all([profilePromise, listingPromise]);
            const preview = toConversationPreviewViewModel(
              conversation,
              profileData,
              listingData,
              user.id
            );

            return {
              ...preview,
              participantId: otherParticipantId || '',
              listingId: listingData?._id || listingKey,
            };
          })
        );

        if (!isMounted) {
          return;
        }

        setConversations(enrichedConversations);
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load conversations');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadConversations();

    const intervalId = window.setInterval(() => {
      loadConversations(false);
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user?.id]);

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Messages"
        title="Your conversations"
        description="Read new messages, reply quickly, and keep each chat tied to the right listing."
        actions={
          <Link to="/listings" className="text-sm font-semibold text-app-soft no-underline transition hover:text-white">
            Browse listings
          </Link>
        }
      />

      <Card className="flex flex-col gap-3 border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-app-soft">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </p>
        {isRefreshing ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
            Refreshing inbox...
          </p>
        ) : null}
      </Card>

      {error ? (
        <ErrorBanner
          title="We couldn't load your conversations"
          message={`${error}. Refresh and try again in a moment.`}
        />
      ) : null}

      {isLoading ? <ConversationsSkeleton /> : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Start by opening a listing and messaging the seller. Your active threads will show up here."
          action={
            <Link to="/listings" className="no-underline">
              <Button variant="secondary">Browse listings</Button>
            </Link>
          }
        />
      ) : null}

      {!isLoading && !error && conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card
              key={conversation.id}
              as={Link}
              to={`/messages/${conversation.id}`}
              variant="interactive"
              className="block space-y-4 no-underline"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{conversation.participantName}</h2>
                    {conversation.isUnread ? (
                      <span className="inline-flex h-3 w-3 rounded-full bg-gatorOrange" aria-label="Unread conversation" />
                    ) : null}
                  </div>
                  <p className="text-sm text-app-soft">
                    {conversation.listingName !== 'General conversation'
                      ? `About ${conversation.listingName}`
                      : conversation.listingName}
                  </p>
                </div>

                <p className="text-sm text-app-muted">{conversation.lastMessageAtLabel}</p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="line-clamp-2 text-sm leading-7 text-app-soft">
                  {conversation.lastMessageText}
                </p>

                <div className="flex flex-wrap gap-2">
                  {conversation.participantId ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-app-soft">
                      Seller profile available
                    </span>
                  ) : null}
                  {conversation.isUnread ? (
                    <span className="rounded-full border border-gatorOrange/30 bg-gatorOrange/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-100">
                      Unread
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
