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

export async function getTransactionByOfferId(offerId, {participantId} = {}) {
  const params = new URLSearchParams();

  if (participantId) {
    params.set('participantId', participantId);
  }

  return fetchFromApi(
    `${API_BASE_URL}/api/transactions/by-offer/${encodeURIComponent(offerId)}${params.toString() ? `?${params.toString()}` : ''}`,
    undefined,
    'Failed to load transaction'
  );
}

export async function submitTransactionDecision(transactionId, payload) {
  return fetchFromApi(
    `${API_BASE_URL}/api/transactions/${encodeURIComponent(transactionId)}/decision`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Failed to update transaction'
  );
}
