const API_BASE_URL = 'http://localhost:5000';

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export async function getConversations(participantId) {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations?participantId=${encodeURIComponent(participantId)}`
  );

  return readJson(response, 'Failed to load conversations');
}

export async function createConversation({participantIds, activeListingId}) {
  const response = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participantIds,
      activeListingId,
    }),
  });

  return readJson(response, 'Failed to create conversation');
}

export async function getConversationMessages(conversationId, participantId) {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages?participantId=${encodeURIComponent(participantId)}`
  );

  return readJson(response, 'Failed to load messages');
}

export async function sendMessage({conversationId, senderClerkUserId, body, attachedListingId}) {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      senderClerkUserId,
      body,
      attachedListingId,
    }),
  });

  return readJson(response, 'Failed to send message');
}
