import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { Button, Card, ErrorBanner, Skeleton, Textarea } from '../components/ui';
import { getConversationMessages, sendMessage } from '../lib/messagesApi';

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
  const [listingId, setListingId] = useState('');
  const [listingName, setListingName] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [pageError, setPageError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
        setListingName(listingData?.itemName || '');
        setListingId(listingData?._id || threadData.conversation.activeListingId?.toString?.() || '');
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

  if (isLoading) {
    return <ThreadSkeleton />;
  }

  return (
    <section className="w-full space-y-6">
      <Link
        to="/messages"
        className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft no-underline transition hover:text-white"
      >
        <span aria-hidden="true">&larr;</span>
        Back to messages
      </Link>

      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
          Conversation
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {otherParticipantName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-app-soft">
          {otherParticipantId ? (
            <Link to={`/profile/${otherParticipantId}`} className="no-underline transition hover:text-white">
              View seller profile
            </Link>
          ) : null}
          {listingName && listingId ? (
            <Link to={`/items/${listingId}`} className="no-underline transition hover:text-white">
              About {listingName}
            </Link>
          ) : (
            <span>General conversation</span>
          )}
          {isRefreshing ? (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              Refreshing thread...
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

      {listingName && listingId ? (
        <Card variant="subtle" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
              Listing context
            </p>
            <p className="text-lg font-semibold text-white">{listingName}</p>
          </div>
          <Link
            to={`/items/${listingId}`}
            className="text-sm font-semibold text-app-soft no-underline transition hover:text-white"
          >
            Open listing
          </Link>
        </Card>
      ) : null}

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
              const isOwnMessage = message.senderClerkUserId === user.id;

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-card sm:max-w-[75%] ${
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
            <p className="text-sm text-app-soft">
              Keep pickup details and negotiation notes in the thread so they are easy to revisit.
            </p>
            <Button type="submit" loading={isSending}>
              Send message
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
