import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { getConversations } from "../lib/messagesApi";

function formatTimestamp(value) {
  if (!value) {
    return "No messages yet";
  }

  return new Date(value).toLocaleString();
}

export function MessagesPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadConversations = async (showLoadingState = true) => {
      if (!user?.id) {
        return;
      }

      try {
        if (showLoadingState && isMounted) {
          setIsLoading(true);
        }

        const conversationData = await getConversations(getToken);

        const enrichedConversations = await Promise.all(
          conversationData.map(async (conversation) => {
            const otherParticipantId = conversation.participantIds.find(
              (participantId) => participantId !== user.id
            );

            const profilePromise = otherParticipantId
              ? fetch(`http://localhost:5000/profile/${otherParticipantId}`)
                  .then((response) => (response.ok ? response.json() : null))
                  .catch(() => null)
              : Promise.resolve(null);

            const listingPromise = conversation.activeListingId
              ? fetch(`http://localhost:5000/items/${conversation.activeListingId}`)
                  .then((response) => (response.ok ? response.json() : null))
                  .catch(() => null)
              : Promise.resolve(null);

            const [profileData, listingData] = await Promise.all([profilePromise, listingPromise]);
            const lastReadAt = conversation.lastReadAtByUser?.[user.id];
            const isUnread = Boolean(
              conversation.lastMessageAt &&
              (!lastReadAt || new Date(lastReadAt) < new Date(conversation.lastMessageAt))
            );

            return {
              ...conversation,
              otherParticipantId,
              otherParticipantName: profileData?.profile?.profileName || otherParticipantId,
              listingName: listingData?.itemName || null,
              isUnread,
            };
          })
        );

        if (!isMounted) {
          return;
        }

        setConversations(enrichedConversations);
        setError("");
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load conversations");
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
  }, [getToken, user?.id]);

  if (isLoading) {
    return <p>Loading conversations...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <main style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "20px" }}>Messages</h1>
      {conversations.length === 0 ? (
        <p>No conversations yet. Start by messaging a seller from an item page.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {conversations.map((conversation) => (
            <Link
              key={conversation._id}
              to={`/messages/${conversation._id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  border: conversation.isUnread ? "2px solid #FA4616" : "1px solid #d1d5db",
                  borderRadius: "10px",
                  padding: "16px",
                  backgroundColor: conversation.isUnread ? "#fff7ed" : "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <h2 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
                      {conversation.otherParticipantName}
                    </h2>
                    <p style={{ margin: "0 0 6px 0", color: "#374151" }}>
                      {conversation.listingName
                        ? `About: ${conversation.listingName}`
                        : "General conversation"}
                    </p>
                    <p style={{ margin: 0, color: "#6b7280" }}>
                      {conversation.lastMessageText || "No messages yet"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "140px" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280" }}>
                      {formatTimestamp(conversation.lastMessageAt)}
                    </p>
                    {conversation.isUnread ? (
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: "#FA4616",
                          color: "white",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        Unread
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
