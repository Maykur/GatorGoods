import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { PickupHubPicker } from '../components/PickupHubPicker';
import { AppIcon, Avatar, Button, Card, ErrorBanner, Skeleton, Textarea } from '../components/ui';
import { getPickupHubById, resolvePickupHub } from '../lib/pickupHubs';
import { getConversationMessages, sendMessage, updateConversationPickup } from '../lib/messagesApi';

const API_BASE_URL = 'http://localhost:5000';

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

export function ChatThreadPage() {
  const { conversationId } = useParams();
  const { user } = useUser();
  const messagesEndRef = useRef(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherParticipantId, setOtherParticipantId] = useState('');
  const [otherParticipantName, setOtherParticipantName] = useState('Conversation');
  const [otherParticipantAvatarUrl, setOtherParticipantAvatarUrl] = useState('');
  const [listingId, setListingId] = useState('');
  const [listingName, setListingName] = useState('');
  const [listingPickupHubId, setListingPickupHubId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [pickupValues, setPickupValues] = useState({
    pickupHubId: '',
    pickupNote: '',
  });
  const [pageError, setPageError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPickupEditorOpen, setIsPickupEditorOpen] = useState(false);
  const [isUpdatingPickup, setIsUpdatingPickup] = useState(false);
  const conversationListings = listingName && listingId
    ? [{ id: listingId, name: listingName }]
    : [];
  const activePickupHubId = conversation?.activePickupHubId || listingPickupHubId || '';
  const activePickupHub = getPickupHubById(activePickupHubId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

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
        setOtherParticipantId(otherId || '');
        setOtherParticipantName(profileData?.profile?.profileName || otherId || 'Conversation');
        setOtherParticipantAvatarUrl(profileData?.profile?.profilePicture || '');
        setListingName(listingData?.itemName || '');
        setListingId(listingData?._id || threadData.conversation.activeListingId?.toString?.() || '');
        setListingPickupHubId(listingData?.pickupHubId || resolvePickupHub(listingData?.itemLocation)?.id || '');
        setPageError('');
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
      pickupHubId: conversation?.activePickupHubId || listingPickupHubId || '',
      pickupNote: conversation?.activePickupNote || '',
    });
  }, [conversation?.activePickupHubId, conversation?.activePickupNote, isPickupEditorOpen, listingPickupHubId]);

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
        attachedListingId: conversation?.activeListingId || null,
      });

      setMessages((currentMessages) => [...currentMessages, newMessage]);
      setConversation((currentConversation) =>
        currentConversation
          ? {
              ...currentConversation,
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

  const handlePickupHubChange = (pickupHubId) => {
    setPickupValues((currentValues) => ({
      ...currentValues,
      pickupHubId,
    }));
    setPickupError('');
  };

  const handlePickupSubmit = async (event) => {
    event.preventDefault();

    if (!pickupValues.pickupHubId.trim()) {
      setPickupError('Choose a pickup hub before updating the thread.');
      return;
    }

    try {
      setIsUpdatingPickup(true);
      const result = await updateConversationPickup({
        conversationId,
        requesterClerkUserId: user.id,
        pickupHubId: pickupValues.pickupHubId,
        pickupNote: pickupValues.pickupNote,
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

      {conversationListings.length > 0 ? (
        <Card variant="subtle" className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="listing" className="text-[0.95em]" />
              <span>Listings in this conversation</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {conversationListings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/items/${listing.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-app-soft no-underline transition hover:border-white/20 hover:text-white"
                >
                  <AppIcon icon="listing" className="text-[0.95em]" />
                  <span>{listing.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card variant="subtle" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              <AppIcon icon="location" className="text-[0.95em]" />
              <span>Active pickup hub</span>
            </div>
            <h2 className="text-xl font-semibold text-white">
              {activePickupHub?.label || 'Pickup hub not set yet'}
            </h2>
            <p className="text-sm leading-7 text-app-soft">
              {activePickupHub?.description || 'Choose a campus meetup hub so both participants stay aligned in this thread.'}
            </p>
            {conversation?.activePickupNote ? (
              <p className="text-sm leading-7 text-app-soft">
                Note: {conversation.activePickupNote}
              </p>
            ) : null}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon="location"
            onClick={() => {
              setPickupValues({
                pickupHubId: conversation?.activePickupHubId || listingPickupHubId || '',
                pickupNote: conversation?.activePickupNote || '',
              });
              setPickupError('');
              setIsPickupEditorOpen((isOpen) => !isOpen);
            }}
          >
            {isPickupEditorOpen ? 'Hide pickup editor' : 'Suggest different pickup spot'}
          </Button>
        </div>

        {isPickupEditorOpen ? (
          <form className="space-y-4" onSubmit={handlePickupSubmit}>
            <PickupHubPicker
              id="conversation-pickup-hub"
              label="Updated pickup hub"
              description="Choose a new approved campus meetup hub for this conversation."
              selectedHubId={pickupValues.pickupHubId}
              onChange={handlePickupHubChange}
              error={pickupError}
              required
            />
            <Textarea
              id="conversation-pickup-note"
              label="Optional pickup note"
              leadingIcon="message"
              rows={3}
              value={pickupValues.pickupNote}
              onChange={(event) => {
                setPickupValues((currentValues) => ({
                  ...currentValues,
                  pickupNote: event.target.value,
                }));
                setPickupError('');
              }}
              placeholder="Meet outside the main entrance..."
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" leadingIcon="verified" loading={isUpdatingPickup}>
                Update pickup spot
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
        <div className="max-h-[32rem] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
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
                return (
                  <div key={message._id} className="flex justify-center">
                    <div className="max-w-[85%] rounded-full border border-gatorOrange/20 bg-gatorOrange/10 px-4 py-2 text-center">
                      <p className="text-sm font-medium text-white">{message.body}</p>
                      <p className="mt-1 text-xs text-app-muted">{formatMessageTime(message.createdAt)}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message._id}
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
                      className={`rounded-[1.5rem] px-4 py-3 shadow-card ${
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
              <span>Keep pickup details and notes here so you can find them later.</span>
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
