import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { PickupHubPicker } from '../components/PickupHubPicker';
import { AppIcon, Avatar, Button, Card, ErrorBanner, Skeleton, Textarea } from '../components/ui';
import { getPickupHubById, resolvePickupHub } from '../lib/pickupHubs';
import { getConversationMessages, sendMessage, updateConversationPickup } from '../lib/messagesApi';

const API_BASE_URL = 'http://localhost:5000';
const MIN_PICKUP_SPECIFICS_LENGTH = 8;
const NEAR_BOTTOM_THRESHOLD_PX = 96;

function normalizeId(value) {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value.toString();
}

function ThreadSkeleton() {
  return (
    <section className="w-full space-y-6">
      <Skeleton className="h-5 w-36" />
      <div className="space-y-3">
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-6 w-80" />
      </div>
      <Card className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
          >
            <Skeleton className="h-20 w-full max-w-md rounded-[1.5rem]" />
          </div>
        ))}
      </Card>
    </section>
  );
}

function formatMessageTime(value) {
  if (!value) {
    return 'Just now';
  }

  return new Date(value).toLocaleString();
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

function getFirstName(name) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return '';
  }

  return trimmedName.split(/\s+/)[0];
}

function isNearBottom(element) {
  if (!element) {
    return true;
  }

  const remainingDistance = element.scrollHeight - element.scrollTop - element.clientHeight;
  return remainingDistance <= NEAR_BOTTOM_THRESHOLD_PX;
}

function getChipStyle(state, isSelected) {
  if (isSelected) {
    return 'border-brand-blue/70 bg-brand-blue/20 text-white';
  }

  if (state === 'completedHere') {
    return 'border-white/10 bg-white/6 text-app-muted';
  }

  if (state === 'unavailable') {
    return 'border-white/10 bg-white/6 text-app-muted';
  }

  return 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white';
}

function getChipIcon(state) {
  if (state === 'pending') {
    return 'time';
  }

  if (state === 'completedHere') {
    return 'verified';
  }

  if (state === 'unavailable') {
    return 'unavailable';
  }

  return 'listing';
}

function getChipStatusLabel(state) {
  if (state === 'pending') {
    return 'Pending in this thread';
  }

  if (state === 'completedHere') {
    return 'Completed here';
  }

  if (state === 'unavailable') {
    return 'Unavailable';
  }

  return 'Active';
}

function getRailPriority(state) {
  if (state === 'pending') {
    return 0;
  }

  if (state === 'active') {
    return 1;
  }

  return 2;
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortLinkedItemsForRail(linkedItems = []) {
  return [...linkedItems].sort((firstItem, secondItem) => {
    const firstPriority = getRailPriority(firstItem.state);
    const secondPriority = getRailPriority(secondItem.state);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    const firstTimestamp = getTimestamp(firstItem.lastContextAt);
    const secondTimestamp = getTimestamp(secondItem.lastContextAt);

    return secondTimestamp - firstTimestamp;
  });
}

export function ChatThreadPage() {
  const { conversationId } = useParams();
  const { user } = useUser();
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const messageRefs = useRef(new Map());
  const pendingScrollBehaviorRef = useRef(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherParticipantId, setOtherParticipantId] = useState('');
  const [otherParticipantName, setOtherParticipantName] = useState('Conversation');
  const [otherParticipantAvatarUrl, setOtherParticipantAvatarUrl] = useState('');
  const [listingOriginalPickupHubId, setListingOriginalPickupHubId] = useState('');
  const [listingOriginalPickupLabel, setListingOriginalPickupLabel] = useState('');
  const [listingCurrentPickupHubId, setListingCurrentPickupHubId] = useState('');
  const [listingCurrentPickupLabel, setListingCurrentPickupLabel] = useState('');
  const [listingSellerId, setListingSellerId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [pickupValues, setPickupValues] = useState({
    pickupHubId: '',
    pickupSpecifics: '',
  });
  const [pageError, setPageError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPickupEditorOpen, setIsPickupEditorOpen] = useState(false);
  const [isUpdatingPickup, setIsUpdatingPickup] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const conversationLinkedItems = Array.isArray(conversation?.linkedItems) ? conversation.linkedItems : [];
  const orderedConversationLinkedItems = sortLinkedItemsForRail(conversationLinkedItems);
  const selectedActiveItem = conversationLinkedItems.find(
    (linkedItem) =>
      linkedItem.state === 'active' &&
      normalizeId(linkedItem.listingId) === normalizeId(selectedListingId)
  ) || null;
  const focusedItem =
    selectedActiveItem ||
    conversation?.activeItem ||
    conversationLinkedItems.find((linkedItem) => linkedItem.state === 'active') ||
    conversationLinkedItems[0] ||
    null;
  const composerListingId =
    normalizeId(selectedActiveItem?.listingId) ||
    (conversation?.activeItem?.state === 'active' ? normalizeId(conversation.activeItem.listingId) : '') ||
    '';
  const activePickupHubId =
    conversation?.activePickupHubId ||
    (conversation?.activePickupSpecifics ? listingCurrentPickupHubId : '') ||
    listingOriginalPickupHubId ||
    '';
  const activePickupHub = getPickupHubById(activePickupHubId);
  const activePickupLabel =
    activePickupHub?.label ||
    (conversation?.activePickupSpecifics ? listingCurrentPickupLabel : '') ||
    listingOriginalPickupLabel ||
    '';
  const isSeller = Boolean(user?.id && listingSellerId && user.id === listingSellerId);
  const isAcceptedMeetupLocked = Boolean(conversation?.isMeetupHubLocked);
  const buyerFirstName = getFirstName(otherParticipantName);
  const meetupHintTarget = buyerFirstName || 'the buyer';
  const pickupHubError = pickupError.toLowerCase().includes('hub') ? pickupError : '';
  const pickupSpecificsError =
    pickupError && !pickupHubError ? pickupError : '';

  useEffect(() => {
    if (!pendingScrollBehaviorRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: pendingScrollBehaviorRef.current,
      block: 'end',
    });
    pendingScrollBehaviorRef.current = null;
  }, [messages]);

  useEffect(() => {
    if (!highlightedMessageId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedMessageId('');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [highlightedMessageId]);

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async (showLoadingState = true) => {
      if (!user?.id || !conversationId) {
        return;
      }

      try {
        if (showLoadingState) {
          setIsLoading(true);
        } else if (isMounted) {
          setIsRefreshing(true);
        }

        const threadData = await getConversationMessages(conversationId, user.id);
        const shouldAutoScroll = showLoadingState || isNearBottom(messagesScrollRef.current);
        const otherId = threadData.conversation.participantIds.find(
          (participantId) => participantId !== user.id
        );
        const [profileData, listingData] = await Promise.all([
          otherId ? fetchOptionalJson(`${API_BASE_URL}/profile/${otherId}`) : Promise.resolve(null),
          threadData.conversation.activeListingId
            ? fetchOptionalJson(`${API_BASE_URL}/items/${threadData.conversation.activeListingId}`)
            : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setConversation(threadData.conversation);
        setMessages(threadData.messages);
        setSelectedListingId((currentListingId) => {
          const nextLinkedItems = Array.isArray(threadData.conversation.linkedItems)
            ? threadData.conversation.linkedItems
            : [];
          const hasCurrentActiveSelection = nextLinkedItems.some(
            (linkedItem) =>
              linkedItem.state === 'active' &&
              normalizeId(linkedItem.listingId) === normalizeId(currentListingId)
          );

          if (hasCurrentActiveSelection) {
            return currentListingId;
          }

          if (threadData.conversation.activeItem?.state === 'active') {
            return normalizeId(threadData.conversation.activeItem.listingId);
          }

          return normalizeId(
            nextLinkedItems.find((linkedItem) => linkedItem.state === 'active')?.listingId
          );
        });
        setOtherParticipantId(otherId || '');
        setOtherParticipantName(profileData?.profile?.profileName || otherId || 'Conversation');
        setOtherParticipantAvatarUrl(profileData?.profile?.profilePicture || '');
        setListingOriginalPickupHubId(
          listingData?.originalPickupHubId ||
            listingData?.pickupHubId ||
            resolvePickupHub(listingData?.originalItemLocation || listingData?.itemLocation)?.id ||
            ''
        );
        setListingOriginalPickupLabel(
          listingData?.originalItemLocation ||
            getPickupHubById(listingData?.originalPickupHubId || listingData?.pickupHubId)?.label ||
            listingData?.itemLocation ||
            ''
        );
        setListingCurrentPickupHubId(
          listingData?.pickupHubId || resolvePickupHub(listingData?.itemLocation)?.id || ''
        );
        setListingCurrentPickupLabel(
          listingData?.itemLocation ||
            getPickupHubById(listingData?.pickupHubId)?.label ||
            listingData?.originalItemLocation ||
            ''
        );
        setListingSellerId(listingData?.userPublishingID || '');
        setPageError('');
        pendingScrollBehaviorRef.current = shouldAutoScroll
          ? (showLoadingState ? 'auto' : 'smooth')
          : null;
      } catch (loadError) {
        if (isMounted) {
          setPageError(loadError.message || 'Failed to load conversation');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadConversation();

    const intervalId = window.setInterval(() => {
      loadConversation(false);
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (isPickupEditorOpen) {
      return;
    }

    setPickupValues({
      pickupHubId: activePickupHubId,
      pickupSpecifics: conversation?.activePickupSpecifics || '',
    });
  }, [activePickupHubId, conversation?.activePickupSpecifics, isPickupEditorOpen]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!draftMessage.trim()) {
      setComposerError('Enter a message before sending.');
      return;
    }

    try {
      setIsSending(true);
      const newMessage = await sendMessage({
        conversationId,
        senderClerkUserId: user.id,
        body: draftMessage,
        attachedListingId: composerListingId || null,
      });

      pendingScrollBehaviorRef.current = 'smooth';
      setMessages((currentMessages) => [...currentMessages, newMessage]);
      setConversation((currentConversation) =>
        currentConversation
          ? {
              ...currentConversation,
              activeListingId: composerListingId || currentConversation.activeListingId,
              lastMessageText: newMessage.body,
              lastMessageAt: newMessage.createdAt,
              lastReadAtByUser: {
                ...(currentConversation.lastReadAtByUser || {}),
                [user.id]: newMessage.createdAt,
              },
            }
          : currentConversation
      );
      setDraftMessage('');
      setComposerError('');
      setPageError('');
    } catch (sendError) {
      setComposerError(sendError.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleItemChipClick = (linkedItem) => {
    if (!linkedItem) {
      return;
    }

    if (linkedItem.state === 'active') {
      setSelectedListingId(normalizeId(linkedItem.listingId));
      setHighlightedMessageId('');
      return;
    }

    const anchorMessageId = normalizeId(linkedItem.latestContextMessageId);

    if (!anchorMessageId) {
      return;
    }

    setHighlightedMessageId(anchorMessageId);
    messageRefs.current.get(anchorMessageId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handlePickupHubChange = (pickupHubId) => {
    setPickupValues((currentValues) => ({
      ...currentValues,
      pickupHubId,
    }));
    setPickupError('');
  };

  const handlePickupSubmit = async (event) => {
    event.preventDefault();

    if (!isSeller) {
      setPickupError('Only the seller can update the structured meetup details.');
      return;
    }

    const normalizedPickupHubId = pickupValues.pickupHubId.trim();
    const canUseLockedCustomLocation = isAcceptedMeetupLocked && !normalizedPickupHubId && Boolean(activePickupLabel);

    if (!normalizedPickupHubId && !canUseLockedCustomLocation) {
      setPickupError('Choose a meetup hub before updating the thread.');
      return;
    }

    if (pickupValues.pickupSpecifics.trim().length < MIN_PICKUP_SPECIFICS_LENGTH) {
      setPickupError(`Meetup specifics must be at least ${MIN_PICKUP_SPECIFICS_LENGTH} characters.`);
      return;
    }

    try {
      setIsUpdatingPickup(true);
      const result = await updateConversationPickup({
        conversationId,
        requesterClerkUserId: user.id,
        pickupHubId: normalizedPickupHubId,
        pickupSpecifics: pickupValues.pickupSpecifics.trim(),
      });

      setConversation(result.conversation);
      setMessages((currentMessages) => [...currentMessages, result.systemMessage]);
      setPickupError('');
      setIsPickupEditorOpen(false);
      setPageError('');
    } catch (updateError) {
      setPickupError(updateError.message || 'Failed to update pickup details');
    } finally {
      setIsUpdatingPickup(false);
    }
  };

  if (isLoading) {
    return <ThreadSkeleton />;
  }

  return (
    <section className="w-full space-y-6">
      <Link
        to="/messages"
        className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition hover:text-white"
      >
        <AppIcon icon="back" className="text-[0.95em]" />
        <span>Back to messages</span>
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
          <AppIcon icon="messages" className="text-sm" />
          <span>Conversation</span>
        </div>
        {otherParticipantId ? (
          <Link
            to={`/profile/${otherParticipantId}`}
            className="inline-flex items-center gap-4 no-underline transition hover:text-white"
          >
            <Avatar
              src={otherParticipantAvatarUrl}
              name={otherParticipantName}
              alt={otherParticipantName}
              size="lg"
            />
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {otherParticipantName}
            </h1>
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Avatar
              src={otherParticipantAvatarUrl}
              name={otherParticipantName}
              alt={otherParticipantName}
              size="lg"
            />
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {otherParticipantName}
            </h1>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-app-soft">
          {isRefreshing ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="time" className="text-[0.95em]" />
              <span>Refreshing thread...</span>
            </span>
          ) : null}
        </div>
      </div>

      {pageError ? (
        <ErrorBanner
          title="We couldn't load this conversation"
          message={`${pageError}. Refresh and try again in a moment.`}
        />
      ) : null}

      {conversationLinkedItems.length > 0 ? (
        <Card variant="subtle" className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="listing" className="text-[0.95em]" />
              <span>Items in this conversation</span>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {orderedConversationLinkedItems.map((linkedItem) => {
                const isSelected = normalizeId(linkedItem.listingId) === normalizeId(selectedListingId);

                return (
                  <button
                    key={normalizeId(linkedItem.listingId)}
                    type="button"
                    onClick={() => handleItemChipClick(linkedItem)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${getChipStyle(linkedItem.state, isSelected)}`}
                    aria-pressed={isSelected}
                    aria-label={`${linkedItem.title}. ${getChipStatusLabel(linkedItem.state)}.`}
                  >
                    <AppIcon icon={getChipIcon(linkedItem.state)} className="text-[0.95em]" />
                    <span>{linkedItem.title}</span>
                  </button>
                );
              })}
            </div>
            {focusedItem ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {focusedItem.imageUrl ? (
                      <img
                        src={focusedItem.imageUrl}
                        alt={focusedItem.title}
                        className="h-16 w-16 rounded-[1rem] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1rem] border border-white/10 bg-white/5">
                        <AppIcon icon={getChipIcon(focusedItem.state)} className="text-app-muted" />
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                        <AppIcon icon={getChipIcon(focusedItem.state)} className="text-[0.95em]" />
                        <span>{getChipStatusLabel(focusedItem.state)}</span>
                      </span>
                      <h2 className="truncate text-xl font-semibold text-white">{focusedItem.title}</h2>
                      <p className="text-sm text-app-soft">
                        {focusedItem.state === 'active'
                          ? 'Selected for your next tagged message in this thread.'
                          : 'This item stays in the rail so you can jump back to its latest thread context.'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/items/${normalizeId(focusedItem.listingId)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-app-soft no-underline transition hover:border-white/20 hover:text-white"
                  >
                    <AppIcon icon="open" className="text-[0.95em]" />
                    <span>Open item</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card variant="subtle" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="location" className="text-[0.95em]" />
              <span>Meetup hub</span>
            </div>
            <h2 className="ml-6 text-xl font-semibold text-white">
              {activePickupLabel || 'Meetup hub not set yet'}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <AppIcon icon="description" className="text-[0.95em]" />
                <span>Meetup specifics</span>
              </div>
              <p className="ml-6 text-xl font-semibold text-white">
                {conversation?.activePickupSpecifics || 'The seller will add the exact meetup specifics when they confirm the handoff.'}
              </p>
            </div>
          </div>
          {isSeller ? (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="location"
              onClick={() => {
                setPickupValues({
                  pickupHubId: activePickupHubId,
                  pickupSpecifics: conversation?.activePickupSpecifics || '',
                });
                setPickupError('');
                setIsPickupEditorOpen((isOpen) => !isOpen);
              }}
            >
              {isPickupEditorOpen ? 'Hide meetup editor' : 'Edit meetup details'}
            </Button>
          ) : null}
        </div>

        {!isSeller ? (
          <p className="text-sm leading-7 text-app-soft">
            Need a different spot? Suggest it in chat and the seller can update the official meetup details here.
          </p>
        ) : null}

        {isPickupEditorOpen ? (
          <form className="space-y-4" onSubmit={handlePickupSubmit}>
            <PickupHubPicker
              id="conversation-pickup-hub"
              label="Meetup hub"
              description={
                isAcceptedMeetupLocked
                  ? 'The meetup hub is locked after offer acceptance. You can still review it here.'
                  : 'Choose the approved campus meetup hub for this handoff.'
              }
              selectedHubId={pickupValues.pickupHubId}
              onChange={handlePickupHubChange}
              error={pickupHubError}
              required
              disabled={isAcceptedMeetupLocked}
            />
            {isAcceptedMeetupLocked ? (
              <p className="rounded-[1rem] border border-app-danger/30 bg-app-danger/15 px-4 py-3 text-sm leading-6 text-red-100">
                The meetup hub is locked after acceptance so both sides keep one consistent pickup plan. You can still update the meetup specifics below.
              </p>
            ) : null}
            <Textarea
              id="conversation-pickup-specifics"
              label="Meetup specifics"
              leadingIcon="message"
              required
              rows={3}
              value={pickupValues.pickupSpecifics}
              onChange={(event) => {
                setPickupValues((currentValues) => ({
                  ...currentValues,
                  pickupSpecifics: event.target.value,
                }));
                setPickupError('');
              }}
              error={pickupSpecificsError}
              hint={`Add the exact entrance, room, or side of the building ${meetupHintTarget} should use.`}
              placeholder="Outside the north entrance by the benches..."
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" leadingIcon="verified" loading={isUpdatingPickup}>
                Save meetup details
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsPickupEditorOpen(false);
                  setPickupError('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div
          ref={messagesScrollRef}
          data-testid="thread-messages-scroll-region"
          className="max-h-[32rem] space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
        >
          {messages.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center">
              <h2 className="text-xl font-semibold text-white">No messages yet</h2>
              <p className="mt-2 text-sm leading-7 text-app-soft">
                Start the conversation below so details stay tied to this listing.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isSystemMessage = message.senderClerkUserId === 'system';
              const isOwnMessage = message.senderClerkUserId === user.id;

              if (isSystemMessage) {
                const isAcceptedOfferMessage = message.body.startsWith('Offer accepted.');
                const systemMessageClassName = isAcceptedOfferMessage
                  ? 'border-app-success/30 bg-app-success/15'
                  : 'border-gatorOrange/20 bg-gatorOrange/10';
                const systemTimestampClassName = isAcceptedOfferMessage
                  ? 'text-green-100/75'
                  : 'text-app-muted';

                return (
                  <div
                    key={message._id}
                    ref={(node) => {
                      if (node) {
                        messageRefs.current.set(normalizeId(message._id), node);
                      } else {
                        messageRefs.current.delete(normalizeId(message._id));
                      }
                    }}
                    data-message-id={normalizeId(message._id)}
                    className="flex justify-center"
                  >
                    <div
                      className={`max-w-[85%] rounded-full border px-4 py-2 text-center transition ${
                        highlightedMessageId === normalizeId(message._id)
                          ? 'ring-2 ring-gatorOrange/60 ring-offset-2 ring-offset-app-bg'
                          : ''
                      } ${systemMessageClassName}`}
                    >
                      <p className="text-sm font-medium text-white">{message.body}</p>
                      <p className={`mt-1 text-xs ${systemTimestampClassName}`}>{formatMessageTime(message.createdAt)}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message._id}
                  ref={(node) => {
                    if (node) {
                      messageRefs.current.set(normalizeId(message._id), node);
                    } else {
                      messageRefs.current.delete(normalizeId(message._id));
                    }
                  }}
                  data-message-id={normalizeId(message._id)}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] items-end gap-3 sm:max-w-[75%] ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    {!isOwnMessage ? (
                      <Avatar
                        src={otherParticipantAvatarUrl}
                        name={otherParticipantName}
                        alt={otherParticipantName}
                        size="sm"
                      />
                    ) : null}
                    <div
                      className={`rounded-[1.5rem] px-4 py-3 shadow-card transition ${
                        highlightedMessageId === normalizeId(message._id)
                          ? 'ring-2 ring-gatorOrange/60 ring-offset-2 ring-offset-app-bg'
                          : ''
                      } ${
                        isOwnMessage
                          ? 'bg-brand-blue text-white'
                          : 'border border-white/10 bg-app-elevated text-app-text'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
                      <p
                        className={`mt-2 text-xs ${
                          isOwnMessage ? 'text-blue-100/80' : 'text-app-muted'
                        }`}
                      >
                        {isOwnMessage ? 'You' : otherParticipantName} · {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      <Card className="space-y-4">
        <form className="space-y-4" onSubmit={handleSendMessage}>
          <Textarea
            id="thread-message"
            label="Message"
            leadingIcon="message"
            rows={4}
            value={draftMessage}
            onChange={(event) => {
              setDraftMessage(event.target.value);
              if (composerError) {
                setComposerError('');
              }
            }}
            error={composerError}
            placeholder="Write your message here..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm text-app-soft">
              <AppIcon icon="location" className="text-[0.95em]" />
              <span>Use chat for suggestions and questions. The structured meetup details above stay as the source of truth.</span>
            </p>
            <Button type="submit" leadingIcon="send" loading={isSending}>
              Send message
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
