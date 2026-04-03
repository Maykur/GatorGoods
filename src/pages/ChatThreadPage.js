import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { PickupHubPicker } from '../components/PickupHubPicker';
import { AppIcon, Avatar, Button, Card, ErrorBanner, Skeleton, Textarea } from '../components/ui';
import { isMeetupScheduledToday } from '../lib/meetupSchedule';
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  if (isSameDay) {
    return timeLabel;
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);

  return `${dateLabel} • ${timeLabel}`;
}

function getSystemMessageTitle(message) {
  const offerTitle = message.offerContext?.title;

  if (offerTitle) {
    return offerTitle;
  }

  const body = typeof message.body === 'string' ? message.body.trim() : '';

  if (!body) {
    return '';
  }

  if (/^sale completed\.\s*/i.test(body)) {
    return body.replace(/^sale completed\.\s*/i, '').trim();
  }

  return body;
}

function getOfferSystemMessageHref(message, viewerId = '') {
  const offerContext = message?.offerContext;
  const offerId = normalizeId(offerContext?.offerId);

  if (!offerId) {
    return '';
  }

  if (offerContext?.eventType === 'sent' || offerContext?.eventType === 'accepted') {
    const sellerId = normalizeId(offerContext?.sellerClerkUserId);
    const mode = viewerId && sellerId && viewerId === sellerId ? 'seller' : 'buyer';
    return `/offers?mode=${mode}&offer=${offerId}`;
  }

  return '';
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
    if (state === 'completedHere' || state === 'unavailable') {
      return 'border-brand-blue/45 bg-brand-blue/12 text-white/92';
    }

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

function isSelectableComposerState(state) {
  return state === 'active' || state === 'pending';
}

function getFocusedItemStatusLabel(state) {
  if (state === 'pending') {
    return 'Pending';
  }

  if (state === 'completedHere') {
    return 'Purchased';
  }

  if (state === 'unavailable') {
    return 'Unavailable';
  }

  return 'Available';
}

function getRelationshipRoleLabel(role) {
  if (role === 'selling') {
    return 'Selling';
  }

  if (role === 'buying') {
    return 'Buying';
  }

  return '';
}

function getRelationshipRoleIcon(role) {
  if (role === 'selling') {
    return 'outgoing';
  }

  return null;
}

function getRelationshipRoleTooltip(role) {
  if (role === 'selling') {
    return 'You are selling this item.';
  }

  return '';
}

function getOfferEventStyle(eventType) {
  if (eventType === 'accepted') {
    return {
      container: 'border-brand-blue/40 bg-brand-blue/20',
      title: 'text-white',
      detail: 'text-blue-100/90',
      timestamp: 'text-blue-100/80',
    };
  }

  if (eventType === 'declined') {
    return {
      container: 'border-app-danger/30 bg-app-danger/15',
      title: 'text-white',
      detail: 'text-red-100/80',
      timestamp: 'text-red-100/70',
    };
  }

  return {
    container: 'border-white/12 bg-white/6',
    title: 'text-white',
    detail: 'text-app-soft',
    timestamp: 'text-app-muted',
  };
}

function getCompletedSaleMessageStyle() {
  return {
    container: 'border-app-success/30 bg-app-success/15',
    title: 'text-white',
    detail: 'text-green-100/85',
    timestamp: 'text-green-100/75',
  };
}

function getSystemMessageStyle(message) {
  if (message.offerContext?.eventType) {
    return getOfferEventStyle(message.offerContext.eventType);
  }

  if (/sale completed/i.test(message.body || '')) {
    return getCompletedSaleMessageStyle();
  }

  return {
    container: 'border-gatorOrange/20 bg-gatorOrange/10',
    title: 'text-white',
    detail: 'text-app-soft',
    timestamp: 'text-app-muted',
  };
}

function RelationshipRoleMarker({role, className = '', onShowTooltip, onHideTooltip, focusable = false}) {
  const icon = getRelationshipRoleIcon(role);
  const tooltip = getRelationshipRoleTooltip(role);

  if (!icon || !tooltip) {
    return null;
  }

  const showTooltip = (event) => {
    if (!onShowTooltip) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    onShowTooltip({
      text: tooltip,
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  };

  return (
    <span
      className={`inline-flex items-center ${className}`.trim()}
      tabIndex={focusable ? 0 : undefined}
      aria-label={focusable ? tooltip : undefined}
      onMouseEnter={showTooltip}
      onFocus={focusable ? showTooltip : undefined}
      onMouseLeave={onHideTooltip}
      onBlur={focusable ? onHideTooltip : undefined}
    >
      <AppIcon icon={icon} className="opacity-80" decorative={false} />
    </span>
  );
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

function truncateText(value, maxLength) {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';

  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function splitDetailLine(detailLine) {
  if (typeof detailLine !== 'string') {
    return [];
  }

  return detailLine
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);
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

function getDefaultThreadItem(conversation, linkedItems = []) {
  const orderedLinkedItems = sortLinkedItemsForRail(linkedItems);

  return (
    orderedLinkedItems[0] ||
    conversation?.activeItem ||
    linkedItems.find((linkedItem) => isSelectableComposerState(linkedItem.state)) ||
    linkedItems[0] ||
    null
  );
}

export function ChatThreadPage() {
  const { conversationId } = useParams();
  const { user } = useUser();
  const messagesScrollRef = useRef(null);
  const messageRefs = useRef(new Map());
  const pendingScrollBehaviorRef = useRef(null);
  const composerContextClearedRef = useRef(false);
  const otherParticipantProfileRef = useRef({
    id: '',
    name: 'Conversation',
    avatarUrl: '',
    loaded: false,
  });
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherParticipantId, setOtherParticipantId] = useState('');
  const [otherParticipantName, setOtherParticipantName] = useState('Conversation');
  const [otherParticipantAvatarUrl, setOtherParticipantAvatarUrl] = useState('');
  const [focusedListingData, setFocusedListingData] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [pickupValues, setPickupValues] = useState({
    pickupHubId: '',
    pickupSpecifics: '',
  });
  const [pageError, setPageError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPickupEditorOpen, setIsPickupEditorOpen] = useState(false);
  const [isUpdatingPickup, setIsUpdatingPickup] = useState(false);
  const [focusedListingId, setFocusedListingId] = useState('');
  const [selectedListingId, setSelectedListingId] = useState('');
  const [isComposerContextCleared, setIsComposerContextCleared] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [roleTooltip, setRoleTooltip] = useState(null);
  const conversationLinkedItems = Array.isArray(conversation?.linkedItems) ? conversation.linkedItems : [];
  const orderedConversationLinkedItems = sortLinkedItemsForRail(conversationLinkedItems);
  const relationshipRoles = Array.from(
    new Set(conversationLinkedItems.map((linkedItem) => linkedItem.relationshipRole).filter(Boolean))
  );
  const shouldShowRelationshipRoles = relationshipRoles.length > 1;
  const locallyFocusedItem = conversationLinkedItems.find(
    (linkedItem) => normalizeId(linkedItem.listingId) === normalizeId(focusedListingId)
  ) || null;
  const defaultContextItem = getDefaultThreadItem(conversation, conversationLinkedItems);
  const selectedComposerItem = conversationLinkedItems.find(
    (linkedItem) =>
      isSelectableComposerState(linkedItem.state) &&
      normalizeId(linkedItem.listingId) === normalizeId(selectedListingId)
  ) || null;
  const sharedComposerItem =
    !isComposerContextCleared && defaultContextItem && isSelectableComposerState(defaultContextItem.state)
      ? defaultContextItem
      : null;
  const composerContextItem = selectedComposerItem || sharedComposerItem || null;
  const focusedItem = locallyFocusedItem || defaultContextItem || null;
  const defaultContextListingId =
    normalizeId(defaultContextItem?.listingId) || normalizeId(conversation?.activeListingId);
  const displayedContextListingId =
    normalizeId(focusedItem?.listingId) || normalizeId(conversation?.activeListingId);
  const composerListingId = normalizeId(composerContextItem?.listingId);
  const shouldShowMessageItemPill = conversationLinkedItems.length > 1;
  const focusedListingDescription = focusedListingData?.itemDescription || '';
  const focusedItemDescription = truncateText(
    focusedListingDescription ||
      (focusedItem?.state === 'unavailable'
        ? 'This item is no longer available on the marketplace, but it remains in your shared history.'
        : 'No item description is available right now.'),
    50
  );
  const isPreviewingAlternateContext =
    Boolean(displayedContextListingId) && displayedContextListingId !== defaultContextListingId;
  const focusedListingOriginalPickupHubId =
    focusedListingData?.originalPickupHubId ||
    focusedListingData?.pickupHubId ||
    resolvePickupHub(focusedListingData?.originalItemLocation || focusedListingData?.itemLocation)?.id ||
    '';
  const focusedListingOriginalPickupLabel =
    focusedListingData?.originalItemLocation ||
    getPickupHubById(focusedListingData?.originalPickupHubId || focusedListingData?.pickupHubId)?.label ||
    focusedListingData?.itemLocation ||
    '';
  const focusedListingCurrentPickupHubId =
    focusedListingData?.pickupHubId || resolvePickupHub(focusedListingData?.itemLocation)?.id || '';
  const focusedListingCurrentPickupLabel =
    focusedListingData?.itemLocation ||
    getPickupHubById(focusedListingData?.pickupHubId)?.label ||
    focusedListingData?.originalItemLocation ||
    '';
  const isAcceptedMeetupLocked = Boolean(conversation?.isMeetupHubLocked);
  const displayedPickupHubId =
    !isPreviewingAlternateContext
      ? (
          conversation?.activePickupHubId ||
          (conversation?.activePickupSpecifics ? focusedListingCurrentPickupHubId : '') ||
          focusedListingOriginalPickupHubId ||
          ''
        )
      : (
          focusedListingCurrentPickupHubId ||
          focusedListingOriginalPickupHubId ||
          ''
        );
  const displayedPickupHub = getPickupHubById(displayedPickupHubId);
  const displayedPickupLabel =
    displayedPickupHub?.label ||
    (
      !isPreviewingAlternateContext && conversation?.activePickupSpecifics
        ? focusedListingCurrentPickupLabel
        : ''
    ) ||
    focusedListingOriginalPickupLabel ||
    'Location unavailable';
  const isSeller = Boolean(user?.id && focusedListingData?.userPublishingID && user.id === focusedListingData.userPublishingID);
  const displayedPickupSpecifics =
    !isPreviewingAlternateContext
      ? (
          conversation?.activePickupSpecifics ||
          (isAcceptedMeetupLocked
            ? 'Meetup specifics will appear here soon.'
            : 'The seller will add meetup specifics when they confirm the offer.')
        )
      : (
          isSeller
            ? 'Meetup specifics appear here after you confirm an offer for this item.'
            : 'Meetup specifics appear here after the seller confirms an offer for this item.'
        );
  const buyerFirstName = getFirstName(otherParticipantName);
  const meetupHintTarget = buyerFirstName || 'the buyer';
  const pickupHubError = pickupError.toLowerCase().includes('hub') ? pickupError : '';
  const pickupSpecificsError =
    pickupError && !pickupHubError ? pickupError : '';
  const focusedItemCurrentOffer = focusedItem?.currentOffer || null;
  const canOpenTransaction =
    !isPreviewingAlternateContext &&
    focusedItemCurrentOffer?.status === 'accepted' &&
    Boolean(focusedItemCurrentOffer?.offerId) &&
    isMeetupScheduledToday(focusedItemCurrentOffer);

  useEffect(() => {
    if (!pendingScrollBehaviorRef.current) {
      return;
    }

    const scrollRegion = messagesScrollRef.current;

    if (scrollRegion) {
      const nextTop = scrollRegion.scrollHeight;

      if (typeof scrollRegion.scrollTo === 'function') {
        scrollRegion.scrollTo({
          top: nextTop,
          behavior: pendingScrollBehaviorRef.current,
        });
      } else {
        scrollRegion.scrollTop = nextTop;
      }
    }

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
    const hideTooltip = () => {
      setRoleTooltip(null);
    };

    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);

    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async (showLoadingState = true) => {
      if (!user?.id || !conversationId) {
        return;
      }

      try {
        if (showLoadingState) {
          setIsLoading(true);
        }

        const threadData = await getConversationMessages(conversationId, user.id);
        const shouldAutoScroll = showLoadingState || isNearBottom(messagesScrollRef.current);
        const otherId = threadData.conversation.participantIds.find(
          (participantId) => participantId !== user.id
        );
        let otherParticipantProfile = {
          id: otherId || '',
          name: otherId || 'Conversation',
          avatarUrl: '',
          loaded: false,
        };

        if (otherId) {
          const cachedProfile = otherParticipantProfileRef.current;

          if (cachedProfile.id === otherId && cachedProfile.loaded) {
            otherParticipantProfile = cachedProfile;
          } else {
            const profileData = await fetchOptionalJson(`${API_BASE_URL}/profile/${otherId}`);
            otherParticipantProfile = {
              id: otherId,
              name: profileData?.profile?.profileName || otherId,
              avatarUrl: profileData?.profile?.profilePicture || '',
              loaded: Boolean(profileData?.profile),
            };
            otherParticipantProfileRef.current = otherParticipantProfile;
          }
        } else {
          otherParticipantProfileRef.current = otherParticipantProfile;
        }

        if (!isMounted) {
          return;
        }

        setConversation(threadData.conversation);
        setMessages(threadData.messages);
        setSelectedListingId((currentListingId) => {
          const nextLinkedItems = Array.isArray(threadData.conversation.linkedItems)
            ? threadData.conversation.linkedItems
            : [];
          const hasCurrentSelection = nextLinkedItems.some(
            (linkedItem) =>
              normalizeId(linkedItem.listingId) === normalizeId(currentListingId)
          );

          if (hasCurrentSelection) {
            return currentListingId;
          }

          if (composerContextClearedRef.current) {
            return '';
          }

          const nextDefaultContextItem = getDefaultThreadItem(threadData.conversation, nextLinkedItems);

          return normalizeId(nextDefaultContextItem?.listingId);
        });
        setFocusedListingId((currentListingId) => {
          const nextLinkedItems = Array.isArray(threadData.conversation.linkedItems)
            ? threadData.conversation.linkedItems
            : [];
          const hasCurrentFocusedItem = nextLinkedItems.some(
            (linkedItem) => normalizeId(linkedItem.listingId) === normalizeId(currentListingId)
          );

          if (hasCurrentFocusedItem) {
            return currentListingId;
          }

          const nextDefaultContextItem = getDefaultThreadItem(threadData.conversation, nextLinkedItems);

          if (nextDefaultContextItem?.listingId) {
            return normalizeId(nextDefaultContextItem.listingId);
          }

          return '';
        });
        setOtherParticipantId(otherId || '');
        setOtherParticipantName(otherParticipantProfile.name);
        setOtherParticipantAvatarUrl(otherParticipantProfile.avatarUrl);
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
    let isMounted = true;

    const loadFocusedListingData = async () => {
      const normalizedFocusedListingId = displayedContextListingId;

      if (!normalizedFocusedListingId) {
        if (isMounted) {
          setFocusedListingData(null);
        }
        return;
      }

      const listingData = await fetchOptionalJson(`${API_BASE_URL}/items/${normalizedFocusedListingId}`);

      if (isMounted) {
        setFocusedListingData(listingData);
      }
    };

    loadFocusedListingData();

    return () => {
      isMounted = false;
    };
  }, [displayedContextListingId]);

  useEffect(() => {
    if (isPickupEditorOpen) {
      return;
    }

    setPickupValues({
      pickupHubId: displayedPickupHubId,
      pickupSpecifics: conversation?.activePickupSpecifics || '',
    });
  }, [displayedPickupHubId, conversation?.activePickupSpecifics, isPickupEditorOpen]);

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

    const normalizedListingId = normalizeId(linkedItem.listingId);

    if (isSelectableComposerState(linkedItem.state)) {
      if (normalizedListingId === normalizeId(composerContextItem?.listingId)) {
        handleClearComposerContext();
        return;
      }

      setFocusedListingId(normalizedListingId);
      composerContextClearedRef.current = false;
      setIsComposerContextCleared(false);
      setSelectedListingId(normalizedListingId);
      setHighlightedMessageId('');
      return;
    }

    setFocusedListingId(normalizedListingId);
    composerContextClearedRef.current = true;
    setIsComposerContextCleared(true);
    setSelectedListingId(normalizedListingId);
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

  const handleClearComposerContext = () => {
    composerContextClearedRef.current = true;
    setIsComposerContextCleared(true);
    setFocusedListingId('');
    setSelectedListingId('');
    setHighlightedMessageId('');
  };

  const handleComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) {
      return;
    }

    event.preventDefault();

    if (isSending) {
      return;
    }

    handleSendMessage(event);
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
    const canUseLockedCustomLocation =
      isAcceptedMeetupLocked &&
      !normalizedPickupHubId &&
      Boolean(displayedPickupLabel && displayedPickupLabel !== 'Location unavailable');

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
      </div>

      {pageError ? (
        <ErrorBanner
          title="We couldn't load this conversation"
          message={`${pageError}. Refresh and try again in a moment.`}
        />
      ) : null}

      {roleTooltip ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/12 bg-app-bg/95 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-card backdrop-blur-sm"
          style={{
            left: `${roleTooltip.left}px`,
            top: `${roleTooltip.top}px`,
          }}
        >
          {roleTooltip.text}
        </div>
      ) : null}

      {conversationLinkedItems.length > 0 ? (
        <Card variant="subtle" className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="collection" className="text-[0.95em]" />
              <span>Items in this conversation</span>
            </div>
            <div className="relative z-20 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {orderedConversationLinkedItems.map((linkedItem) => {
                const isSelected = normalizeId(linkedItem.listingId) === normalizeId(selectedListingId);
                const relationshipRoleIcon =
                  shouldShowRelationshipRoles && linkedItem.relationshipRole
                    ? getRelationshipRoleIcon(linkedItem.relationshipRole)
                    : null;

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
                    {relationshipRoleIcon ? (
                      <RelationshipRoleMarker
                        role={linkedItem.relationshipRole}
                        className="text-[0.8em]"
                        onShowTooltip={setRoleTooltip}
                        onHideTooltip={() => setRoleTooltip(null)}
                      />
                    ) : null}
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
                        <span>{getFocusedItemStatusLabel(focusedItem.state)}</span>
                        {shouldShowRelationshipRoles && focusedItem.relationshipRole ? (
                          <>
                            <span aria-hidden="true" className="text-app-muted/70">•</span>
                            <RelationshipRoleMarker
                              role={focusedItem.relationshipRole}
                              className="text-[0.85em]"
                              onShowTooltip={setRoleTooltip}
                              onHideTooltip={() => setRoleTooltip(null)}
                            />
                            <span>{getRelationshipRoleLabel(focusedItem.relationshipRole)}</span>
                          </>
                        ) : null}
                      </span>
                      <h2 className="truncate text-xl font-semibold text-white">{focusedItem.title}</h2>
                      <p className="text-sm text-app-soft">{focusedItemDescription}</p>
                      {focusedItem.currentOffer ? (
                        <p className="inline-flex flex-wrap items-center gap-2 text-sm text-app-soft">
                          <span className="inline-flex items-center gap-2 font-semibold text-app-soft">
                            <AppIcon icon="offers" className="text-[0.9em]" />
                            <span>{focusedItem.currentOffer.title}</span>
                          </span>
                          {splitDetailLine(focusedItem.currentOffer.detailLine).map((detailPart) => (
                            <Fragment key={`${focusedItem.listingId}-${detailPart}`}>
                              <span aria-hidden="true" className="text-app-muted/70">•</span>
                              <span>{detailPart}</span>
                            </Fragment>
                          ))}
                        </p>
                      ) : null}
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

      <Card
        variant="subtle"
        className={`space-y-4 ${isPreviewingAlternateContext ? 'border-brand-blue/30 bg-brand-blue/10' : ''}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="location" className="text-[0.95em]" />
              <span>{isPreviewingAlternateContext ? 'Selected item location' : 'Meetup hub'}</span>
            </div>
            <h2 className="ml-6 text-xl font-semibold text-white">
              {displayedPickupLabel}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                <AppIcon icon="locationDetails" className="text-[0.95em]" />
                <span>Meetup specifics</span>
              </div>
              <p className="ml-6 text-xl font-semibold text-white">
                {displayedPickupSpecifics}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenTransaction ? (
              <Link to={`/transact/${focusedItemCurrentOffer.offerId}`} className="no-underline">
                <Button size="sm" leadingIcon="verified">Open transaction</Button>
              </Link>
            ) : null}
            {isSeller && !isPreviewingAlternateContext ? (
              <Button
                variant="secondary"
                size="sm"
                leadingIcon="location"
                onClick={() => {
                  setPickupValues({
                    pickupHubId: displayedPickupHubId,
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
        </div>

        {canOpenTransaction ? (
          <p className="text-sm leading-7 text-gatorOrange">
            Today&apos;s handoff is ready. Open the transaction flow here once you are meeting up.
          </p>
        ) : null}

        {isPreviewingAlternateContext ? (
          <p className="text-sm leading-7 text-blue-100/80">
            {isSeller
              ? 'Need a different meetup hub? The buyer can suggest one in their offer.'
              : 'Want to meet somewhere else? Suggest a different meetup hub in your offer to the seller.'}
          </p>
        ) : !isSeller ? (
          <p className="text-sm leading-7 text-app-soft">
            Need to change the meetup specifics? Message the seller and they can update them here.
          </p>
        ) : null}

        {isPickupEditorOpen && !isPreviewingAlternateContext ? (
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
                const systemMessageStyle = getSystemMessageStyle(message);
                const attachedItemHref = normalizeId(message.attachedItem?.listingId)
                  ? `/items/${normalizeId(message.attachedItem.listingId)}`
                  : '';
                const offerMessageHref = getOfferSystemMessageHref(message, user?.id);

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
                      className={`w-full max-w-[36rem] rounded-full border px-4 py-2 text-center transition ${
                        highlightedMessageId === normalizeId(message._id)
                          ? 'ring-2 ring-gatorOrange/60 ring-offset-2 ring-offset-app-bg'
                          : ''
                      } ${systemMessageStyle.container}`}
                    >
                      {shouldShowMessageItemPill && message.attachedItem ? (
                        attachedItemHref ? (
                          <Link
                            to={attachedItemHref}
                            data-testid="message-attached-item-pill"
                            className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-xs font-semibold text-white/88 no-underline transition hover:border-white/20 hover:bg-white/15 hover:text-white"
                          >
                            <AppIcon icon={getChipIcon(message.attachedItem.state)} className="text-[0.9em]" />
                            {shouldShowRelationshipRoles && message.attachedItem.relationshipRole ? (
                              <RelationshipRoleMarker
                                role={message.attachedItem.relationshipRole}
                                className="text-[0.75em]"
                                onShowTooltip={setRoleTooltip}
                                onHideTooltip={() => setRoleTooltip(null)}
                              />
                            ) : null}
                            <span className="truncate">{message.attachedItem.title}</span>
                          </Link>
                        ) : (
                          <div
                            data-testid="message-attached-item-pill"
                            className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-xs font-semibold text-white/88"
                          >
                            <AppIcon icon={getChipIcon(message.attachedItem.state)} className="text-[0.9em]" />
                            {shouldShowRelationshipRoles && message.attachedItem.relationshipRole ? (
                              <RelationshipRoleMarker
                                role={message.attachedItem.relationshipRole}
                                className="text-[0.75em]"
                                onShowTooltip={setRoleTooltip}
                                onHideTooltip={() => setRoleTooltip(null)}
                              />
                            ) : null}
                            <span className="truncate">{message.attachedItem.title}</span>
                          </div>
                        )
                      ) : null}
                      {offerMessageHref ? (
                        <Link
                          to={offerMessageHref}
                          data-testid={`system-message-link-${normalizeId(message._id)}`}
                          className="block rounded-2xl px-2 py-1 text-inherit no-underline transition hover:bg-white/5"
                        >
                          <p className={`text-sm font-semibold ${systemMessageStyle.title}`}>
                            {getSystemMessageTitle(message)}
                          </p>
                          {message.offerContext?.detailLine ? (
                            <p className={`mt-1 text-sm ${systemMessageStyle.detail}`}>
                              {message.offerContext.detailLine}
                            </p>
                          ) : null}
                          <p className={`mt-1 text-xs ${systemMessageStyle.timestamp}`}>
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className={`text-sm font-semibold ${systemMessageStyle.title}`}>
                            {getSystemMessageTitle(message)}
                          </p>
                          {message.offerContext?.detailLine ? (
                            <p className={`mt-1 text-sm ${systemMessageStyle.detail}`}>
                              {message.offerContext.detailLine}
                            </p>
                          ) : null}
                          <p className={`mt-1 text-xs ${systemMessageStyle.timestamp}`}>
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </>
                      )}
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
                      {shouldShowMessageItemPill && message.attachedItem ? (
                        normalizeId(message.attachedItem.listingId) ? (
                          <Link
                            to={`/items/${normalizeId(message.attachedItem.listingId)}`}
                            data-testid="message-attached-item-pill"
                            className={`mb-2 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold no-underline transition ${
                              isOwnMessage
                                ? 'border-white/15 bg-white/10 text-white/90 hover:border-white/25 hover:bg-white/15 hover:text-white'
                                : 'border-white/10 bg-white/6 text-app-soft hover:border-white/20 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <AppIcon icon={getChipIcon(message.attachedItem.state)} className="text-[0.9em]" />
                            {shouldShowRelationshipRoles && message.attachedItem.relationshipRole ? (
                              <RelationshipRoleMarker
                                role={message.attachedItem.relationshipRole}
                                className="text-[0.75em]"
                                onShowTooltip={setRoleTooltip}
                                onHideTooltip={() => setRoleTooltip(null)}
                              />
                            ) : null}
                            <span className="truncate">{message.attachedItem.title}</span>
                          </Link>
                        ) : (
                          <div
                            data-testid="message-attached-item-pill"
                            className={`mb-2 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                              isOwnMessage
                                ? 'border-white/15 bg-white/10 text-white/90'
                                : 'border-white/10 bg-white/6 text-app-soft'
                            }`}
                          >
                            <AppIcon icon={getChipIcon(message.attachedItem.state)} className="text-[0.9em]" />
                            {shouldShowRelationshipRoles && message.attachedItem.relationshipRole ? (
                              <RelationshipRoleMarker
                                role={message.attachedItem.relationshipRole}
                                className="text-[0.75em]"
                                onShowTooltip={setRoleTooltip}
                                onHideTooltip={() => setRoleTooltip(null)}
                              />
                            ) : null}
                            <span className="truncate">{message.attachedItem.title}</span>
                          </div>
                        )
                      ) : null}
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
        </div>
      </Card>

      <Card className="space-y-4">
        <form className="space-y-4" onSubmit={handleSendMessage}>
          {composerContextItem ? (
            <div
              data-testid="composer-item-context"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3"
            >
              <p className="inline-flex min-w-0 items-center gap-2 text-sm text-app-soft">
                <span className="font-semibold text-app-muted">Discussing:</span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white">
                  <AppIcon icon={getChipIcon(composerContextItem.state)} className="text-[0.95em]" />
                  {shouldShowRelationshipRoles && composerContextItem.relationshipRole ? (
                    <RelationshipRoleMarker
                      role={composerContextItem.relationshipRole}
                      className="text-[0.8em]"
                      onShowTooltip={setRoleTooltip}
                      onHideTooltip={() => setRoleTooltip(null)}
                    />
                  ) : null}
                  <span className="truncate">{composerContextItem.title}</span>
                </span>
              </p>
              <button
                type="button"
                onClick={handleClearComposerContext}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-sm font-semibold text-app-soft transition hover:border-white/20 hover:text-white"
              >
                <AppIcon icon="clear" className="text-[0.9em]" />
                <span>Clear</span>
              </button>
            </div>
          ) : null}
          <Textarea
            id="thread-message"
            className="space-y-4"
            label={(
              <span className="inline-flex items-center gap-2">
                <AppIcon icon="message" className="text-[0.95em] text-app-muted" />
                <span>Message</span>
              </span>
            )}
            rows={4}
            value={draftMessage}
            onChange={(event) => {
              setDraftMessage(event.target.value);
              if (composerError) {
                setComposerError('');
              }
            }}
            onKeyDown={handleComposerKeyDown}
            error={composerError}
            placeholder="Write your message here..."
          />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" leadingIcon="send" loading={isSending}>
              Send message
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
