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

export async function createOffer(listingId, payload) {
  return fetchFromApi(
    `${API_BASE_URL}/api/listings/${encodeURIComponent(listingId)}/offers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Failed to create offer'
  );
}

export async function getOffers({participantId, role}) {
  const params = new URLSearchParams({
    participantId,
    role,
  });

  return fetchFromApi(
    `${API_BASE_URL}/api/offers?${params.toString()}`,
    undefined,
    'Failed to load offers'
  );
}

export async function getIndividualOffer(offerId) {
  return fetchFromApi(
    `${API_BASE_URL}/api/offers/${encodeURIComponent(offerId)}`,
    undefined,
    'Failed to load offer'
  );
}

export async function updateOfferStatus(offerId, payload) {
  return fetchFromApi(
    `${API_BASE_URL}/api/offers/${encodeURIComponent(offerId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Failed to update offer'
  );
}
