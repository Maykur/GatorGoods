const DEFAULT_CATEGORY = 'Miscellaneous';
const DEFAULT_LOCATION = 'Campus pickup';
const DEFAULT_SELLER_NAME = 'GatorGoods Seller';
const DEFAULT_LISTING_TITLE = 'Untitled listing';

export const LISTING_CATEGORIES = [
  'Vehicles',
  'Property Rentals',
  'Apparel & Accessories',
  'Electronics & Computers',
  'Home & Garden',
  'Entertainment & Hobbies',
  'Family',
  DEFAULT_CATEGORY,
];

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeCategory(category) {
  return normalizeText(category, DEFAULT_CATEGORY);
}

export function parsePriceValue(value) {
  const normalized = normalizeText(String(value ?? ''), '0');
  const numericValue = Number(normalized.replace(/[^0-9.-]/g, ''));

  if (!Number.isFinite(numericValue)) {
    return Number.POSITIVE_INFINITY;
  }

  return numericValue;
}

export function formatPriceLabel(value) {
  const normalized = normalizeText(String(value ?? ''), '0');
  const numericValue = parsePriceValue(normalized);

  if (Number.isFinite(numericValue)) {
    const hasDecimals = Math.abs(numericValue % 1) > 0;

    return `$${numericValue.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    })}`;
  }

  return normalized.startsWith('$') ? normalized : `$${normalized}`;
}

export function formatDateLabel(value) {
  if (!value) {
    return 'No messages yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No messages yet';
  }

  return date.toLocaleString();
}

export function toListingCardViewModel(raw) {
  return {
    id: raw?._id || raw?.id || '',
    title: normalizeText(raw?.itemName, DEFAULT_LISTING_TITLE),
    priceLabel: formatPriceLabel(raw?.itemCost),
    condition: normalizeText(raw?.itemCondition, 'Unknown'),
    location: normalizeText(raw?.itemLocation, DEFAULT_LOCATION),
    imageUrl: normalizeText(raw?.itemPicture, ''),
    category: normalizeCategory(raw?.itemCat),
    sellerName: normalizeText(raw?.userPublishingName, DEFAULT_SELLER_NAME),
  };
}

export function toListingDetailViewModel(raw, viewerId = null) {
  const cardView = toListingCardViewModel(raw);
  const sellerId = normalizeText(raw?.userPublishingID, '');

  return {
    id: cardView.id,
    title: cardView.title,
    priceLabel: cardView.priceLabel,
    condition: cardView.condition,
    location: cardView.location,
    imageUrl: cardView.imageUrl,
    description: normalizeText(raw?.itemDescription, 'No description provided yet.'),
    details: normalizeText(raw?.itemDetails, 'No additional details provided.'),
    seller: {
      id: sellerId,
      name: cardView.sellerName,
      avatarUrl: null,
    },
    isOwner: Boolean(viewerId && sellerId && sellerId === viewerId),
  };
}

export function toConversationPreviewViewModel(raw, profile, listing, viewerId) {
  const lastReadAt =
    raw?.lastReadAtByUser?.[viewerId] ||
    (typeof raw?.lastReadAtByUser?.get === 'function' ? raw.lastReadAtByUser.get(viewerId) : null);

  return {
    id: raw?._id || '',
    participantName: normalizeText(profile?.profile?.profileName, raw?.otherParticipantId || 'Conversation'),
    listingName: normalizeText(listing?.itemName, 'General conversation'),
    lastMessageText: normalizeText(raw?.lastMessageText, 'No messages yet'),
    lastMessageAtLabel: formatDateLabel(raw?.lastMessageAt),
    isUnread: Boolean(
      raw?.lastMessageAt && (!lastReadAt || new Date(lastReadAt) < new Date(raw.lastMessageAt))
    ),
  };
}

export function toProfileHeaderViewModel(rawProfile, listings = [], viewerId = null) {
  const profile = rawProfile?.profile || rawProfile || {};
  const ratingValue = Number(profile?.profileRating);
  const listingCount = Array.isArray(listings) ? listings.length : 0;
  const favoritesCount = Array.isArray(profile?.profileFavorites) ? profile.profileFavorites.length : 0;

  return {
    id: normalizeText(profile?.profileID, ''),
    displayName: normalizeText(profile?.profileName, 'GatorGoods User'),
    avatarUrl: normalizeText(profile?.profilePicture, ''),
    ratingLabel: Number.isFinite(ratingValue) && ratingValue > 0 ? `${ratingValue.toFixed(1)}/5` : 'New seller',
    listingCount,
    favoritesCount,
    isOwner: Boolean(viewerId && profile?.profileID && viewerId === profile.profileID),
  };
}
