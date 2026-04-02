const API_BASE_URL = 'http://localhost:5000';
const NETWORK_ERROR_MESSAGE = 'Unable to reach the GatorGoods API. Make sure the backend server is running and try again.';

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

async function fetchFromApi(url, options, fallbackMessage) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  return readJson(response, fallbackMessage);
}

export async function getConversations(participantId) {
  return fetchFromApi(
    `${API_BASE_URL}/api/conversations?participantId=${encodeURIComponent(participantId)}`,
    undefined,
    'Failed to load conversations'
  );
}

export async function createConversation({participantIds, activeListingId}) {
  return fetchFromApi(
    `${API_BASE_URL}/api/conversations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantIds,
        activeListingId,
      }),
    },
    'Failed to create conversation'
  );
}

export async function getConversationMessages(conversationId, participantId) {
  return fetchFromApi(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages?participantId=${encodeURIComponent(participantId)}`,
    undefined,
    'Failed to load messages'
  );
}

export async function sendMessage({conversationId, senderClerkUserId, body, attachedListingId}) {
  return fetchFromApi(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderClerkUserId,
        body,
        attachedListingId,
      }),
    },
    'Failed to send message'
  );
}

export async function updateConversationPickup({
  conversationId,
  requesterClerkUserId,
  pickupHubId,
  pickupNote = '',
}) {
  return fetchFromApi(
    `${API_BASE_URL}/api/conversations/${conversationId}/pickup`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requesterClerkUserId,
        pickupHubId,
        pickupNote,
      }),
    },
    'Failed to update pickup details'
  );
}
