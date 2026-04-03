import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { AppIcon, Avatar, Button, Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '../components/ui';
import { getConversations } from '../lib/messagesApi';
import { toConversationPreviewViewModel } from '../lib/viewModels';

const PAGE_SIZE = 5;

function SellingIndicator({onShowTooltip, onHideTooltip}) {
  const tooltipText = 'You are selling an item in this conversation.';

  const showTooltip = (event) => {
    if (!onShowTooltip) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    onShowTooltip({
      text: tooltipText,
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  };

  return (
    <span
      className="inline-flex items-center text-app-muted"
      tabIndex={0}
      aria-label="Selling in this thread"
      onMouseEnter={showTooltip}
      onFocus={showTooltip}
      onMouseLeave={onHideTooltip}
      onBlur={onHideTooltip}
    >
      <AppIcon icon="outgoing" className="text-[0.9em]" decorative={false} />
    </span>
  );
}

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

export function MessagesPage() {
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sellingTooltip, setSellingTooltip] = useState(null);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    page: 1,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    let isMounted = true;

    const loadConversations = async (showLoadingState = true) => {
      if (!user?.id) {
        return;
      }

      try {
        if (showLoadingState) {
          setIsLoading(true);
        }

        const conversationResponse = await getConversations(user.id, {
          page,
          pageSize: PAGE_SIZE,
        });
        const payload = Array.isArray(conversationResponse)
          ? {
              conversations: conversationResponse,
              totalCount: conversationResponse.length,
              totalPages: 1,
              page: 1,
              pageSize: PAGE_SIZE,
            }
          : conversationResponse;
        const nextConversations = (payload.conversations || []).map((conversation) => {
          const preview = toConversationPreviewViewModel(conversation, user.id);

          return {
            ...preview,
            participantId: conversation.otherParticipant?.id || conversation.otherParticipantId || '',
            listingId: conversation.activeItem?.listingId?.toString?.() || conversation.activeListingId?.toString?.() || '',
          };
        });

        if (!isMounted) {
          return;
        }

        setConversations(nextConversations);
        setPagination({
          totalCount: payload.totalCount || nextConversations.length,
          totalPages: Math.max(1, payload.totalPages || 1),
          page: payload.page || page,
          pageSize: payload.pageSize || PAGE_SIZE,
        });
        setError('');
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load conversations');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
  }, [page, user?.id]);

  const unreadCount = conversations.filter((conversation) => conversation.isUnread).length;
  const pendingPickupCount = conversations.reduce(
    (count, conversation) => count + (conversation.pendingItemCount > 0 ? 1 : 0),
    0
  );
  const startConversationNumber = conversations.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endConversationNumber = conversations.length === 0
    ? 0
    : startConversationNumber + conversations.length - 1;

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Messages"
        icon="messages"
        title="Your conversations"
        description="Read new messages, reply quickly, and keep each chat tied to the right listing."
        actions={
          <Link to="/listings" className="no-underline">
            <Button variant="ghost" size="sm" leadingIcon="browse">
              Browse listings
            </Button>
          </Link>
        }
      />

      <Card className="flex flex-col gap-4 border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-base font-semibold text-white">
            {pagination.totalCount} {pagination.totalCount === 1 ? 'conversation' : 'conversations'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-app-soft">
            <span>{unreadCount} unread on this page</span>
            <span aria-hidden="true" className="text-app-muted/70">•</span>
            <span>{pendingPickupCount} pending {pendingPickupCount === 1 ? 'pickup' : 'pickups'}</span>
            <span aria-hidden="true" className="text-app-muted/70">•</span>
            <span>
              Showing {startConversationNumber}-{endConversationNumber}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pagination.totalPages > 1 ? (
            <p className="text-sm text-app-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          ) : null}
        </div>
      </Card>

      {error ? (
        <ErrorBanner
          title="We couldn't load your conversations"
          message={`${error}. Refresh and try again in a moment.`}
        />
      ) : null}

      {sellingTooltip ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/12 bg-app-bg/95 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-card backdrop-blur-sm"
          style={{
            left: `${sellingTooltip.left}px`,
            top: `${sellingTooltip.top}px`,
          }}
        >
          {sellingTooltip.text}
        </div>
      ) : null}

      {isLoading ? <ConversationsSkeleton /> : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <EmptyState
          icon="messages"
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
                <div className="flex items-start gap-3">
                  <Avatar
                    src={conversation.participantAvatarUrl}
                    name={conversation.participantName}
                    alt={conversation.participantName}
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-white">{conversation.participantName}</h2>
                      {conversation.hasSellingItems ? (
                        <SellingIndicator
                          onShowTooltip={setSellingTooltip}
                          onHideTooltip={() => setSellingTooltip(null)}
                        />
                      ) : null}
                      {conversation.isUnread ? (
                        <span className="inline-flex h-3 w-3 rounded-full bg-gatorOrange" aria-label="Unread conversation" />
                      ) : null}
                    </div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-app-soft">
                      <AppIcon
                        icon={conversation.itemTitles.length > 1 ? 'collection' : 'listing'}
                        className="text-[0.9em] text-app-muted"
                      />
                      <span title={conversation.fullItemTitlesLabel || conversation.fullActiveItemTitle}>
                        {conversation.itemTitlesLabel || conversation.activeItemTitle}
                      </span>
                      {conversation.extraItemCount > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-app-muted">
                          +{conversation.extraItemCount} more
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <p className="inline-flex items-center gap-2 text-sm text-app-muted">
                  <AppIcon icon="time" className="text-[0.9em]" />
                  <span>{conversation.lastMessageAtLabel}</span>
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="line-clamp-2 text-sm leading-7 text-app-soft" title={conversation.fullLastMessagePreviewText}>
                  {conversation.lastMessagePreviewText}
                </p>

                <div className="flex flex-wrap gap-2">
                  {conversation.isUnread ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gatorOrange/30 bg-gatorOrange/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-100">
                      <AppIcon icon="messages" className="text-[0.95em]" />
                      Unread
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && !error && pagination.totalPages > 1 ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-soft">
            Showing {startConversationNumber}-{endConversationNumber} of {pagination.totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leadingIcon="previous"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              trailingIcon="next"
              onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
