const API_BASE_URL = 'http://localhost:5000';
const listingsCache = new Map();
const NETWORK_ERROR_MESSAGE = 'Unable to reach the GatorGoods API. Make sure the backend server is running and try again.';

export function buildListingsQuery({
  page = 1,
  limit = 9,
  search = '',
  category = 'All',
  pickupLocation = 'All',
  sort = 'newest',
}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('sort', sort);

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (category && category !== 'All') {
    params.set('category', category);
  }

  if (pickupLocation && pickupLocation !== 'All') {
    params.set('pickupLocation', pickupLocation);
  }

  return params.toString();
}

export function hasCachedListings(params) {
  return listingsCache.has(buildListingsQuery(params));
}

export function getCachedListings(params) {
  return listingsCache.get(buildListingsQuery(params)) || null;
}

export function clearListingsCache() {
  listingsCache.clear();
}

export async function getListingsPage(params, {preferCache = true} = {}) {
  const query = buildListingsQuery(params);

  if (preferCache && listingsCache.has(query)) {
    return listingsCache.get(query);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/items?${query}`);
  } catch (error) {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch listings');
  }

  const normalizedResponse = {
    items: Array.isArray(data?.items) ? data.items : [],
    meta: {
      page: data?.meta?.page || 1,
      limit: data?.meta?.limit || params.limit || 9,
      totalItems: data?.meta?.totalItems || 0,
      totalPages: data?.meta?.totalPages || 1,
      hasNextPage: Boolean(data?.meta?.hasNextPage),
      hasPreviousPage: Boolean(data?.meta?.hasPreviousPage),
    },
  };

  listingsCache.set(query, normalizedResponse);
  return normalizedResponse;
}
