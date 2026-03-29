const API_BASE_URL = 'http://localhost:5000';

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

async function authFetch(path, getToken, options = {}) {
  const token = await getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function getConversations(getToken) {
  const response = await authFetch('/api/conversations', getToken);

  return readJson(response, 'Failed to load conversations');
}

export async function createConversation({getToken, recipientId, activeListingId}) {
  const response = await authFetch('/api/conversations', getToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientId,
      activeListingId,
    }),
  });

  return readJson(response, 'Failed to create conversation');
}

export async function getConversationMessages(conversationId, getToken) {
  const response = await authFetch(`/api/conversations/${conversationId}/messages`, getToken);

  return readJson(response, 'Failed to load messages');
}

export async function sendMessage({conversationId, getToken, body, attachedListingId}) {
  const response = await authFetch(`/api/conversations/${conversationId}/messages`, getToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body,
      attachedListingId,
    }),
  });

  return readJson(response, 'Failed to send message');
}
