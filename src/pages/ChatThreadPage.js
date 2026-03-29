import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { getConversationMessages, sendMessage } from "../lib/messagesApi";

function formatMessageTime(value) {
  return new Date(value).toLocaleString();
}

export function ChatThreadPage() {
  const { conversationId } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherParticipantName, setOtherParticipantName] = useState("");
  const [listingName, setListingName] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async (showLoadingState = true) => {
      if (!user?.id || !conversationId) {
        return;
      }

      try {
        if (showLoadingState && isMounted) {
          setIsLoading(true);
        }

        const threadData = await getConversationMessages(conversationId, getToken);
        if (!isMounted) {
          return;
        }

        setConversation(threadData.conversation);
        setMessages(threadData.messages);

        const otherParticipantId = threadData.conversation.participantIds.find(
          (participantId) => participantId !== user.id
        );

        const profilePromise = otherParticipantId
          ? fetch(`http://localhost:5000/profile/${otherParticipantId}`)
              .then((response) => (response.ok ? response.json() : null))
              .catch(() => null)
          : Promise.resolve(null);

        const listingPromise = threadData.conversation.activeListingId
          ? fetch(`http://localhost:5000/items/${threadData.conversation.activeListingId}`)
              .then((response) => (response.ok ? response.json() : null))
              .catch(() => null)
          : Promise.resolve(null);

        const [profileData, listingData] = await Promise.all([profilePromise, listingPromise]);
        if (!isMounted) {
          return;
        }

        setOtherParticipantName(profileData?.profile?.profileName || otherParticipantId || "Conversation");
        setListingName(listingData?.itemName || "");
        setError("");
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load conversation");
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
  }, [conversationId, getToken, user?.id]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!draftMessage.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    try {
      setIsSending(true);
      const newMessage = await sendMessage({
        conversationId,
        getToken,
        body: draftMessage,
        attachedListingId: conversation?.activeListingId || null,
      });

      setMessages((currentMessages) => [...currentMessages, newMessage]);
      setConversation((currentConversation) => currentConversation ? {
        ...currentConversation,
        lastMessageText: newMessage.body,
        lastMessageAt: newMessage.createdAt,
        lastReadAtByUser: {
          ...(currentConversation.lastReadAtByUser || {}),
          [user.id]: newMessage.createdAt,
        },
      } : currentConversation);
      setDraftMessage("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <p>Loading conversation...</p>;
  }

  if (error && !conversation) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <main style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ marginBottom: "20px" }}>
        <p style={{ margin: "0 0 8px 0" }}>
          <Link to="/messages">Back to messages</Link>
        </p>
        <h1 style={{ margin: "0 0 8px 0" }}>{otherParticipantName}</h1>
        {listingName ? (
          <p style={{ margin: 0, color: "#4b5563" }}>Talking about: {listingName}</p>
        ) : null}
      </header>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "16px",
          backgroundColor: "white",
          minHeight: "320px",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderClerkUserId === user.id;

            return (
              <div
                key={message._id}
                style={{
                  alignSelf: isOwnMessage ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  backgroundColor: isOwnMessage ? "#dbeafe" : "#f3f4f6",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <p style={{ margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}>{message.body}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                  {isOwnMessage ? "You" : otherParticipantName} | {formatMessageTime(message.createdAt)}
                </p>
              </div>
            );
          })
        )}
      </section>

      <form onSubmit={handleSendMessage} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <textarea
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
          rows={4}
          placeholder="Write a message..."
          style={{
            width: "100%",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            padding: "12px",
            resize: "vertical",
          }}
        />
        {error ? <p style={{ color: "red", margin: 0 }}>{error}</p> : null}
        <div>
          <button
            type="submit"
            disabled={isSending}
            style={{
              backgroundColor: "#1d4ed8",
              color: "white",
              padding: "10px 18px",
              border: "none",
              borderRadius: "999px",
              fontWeight: "bold",
              cursor: isSending ? "wait" : "pointer",
              opacity: isSending ? 0.7 : 1,
            }}
          >
            {isSending ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </main>
  );
}
