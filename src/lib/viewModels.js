import {
  getPickupHubArea,
  getPickupHubLabel,
  normalizePickupHubId,
} from './pickupHubs';

const DEFAULT_CATEGORY = 'Miscellaneous';
const DEFAULT_LOCATION = 'Campus pickup';
const DEFAULT_SELLER_NAME = 'GatorGoods Seller';
const DEFAULT_LISTING_TITLE = 'Untitled listing';
const DEFAULT_LISTING_STATUS = 'active';
const LISTING_STATUS_LABELS = {
  active: 'Active',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Archived',
};
const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  externalApp: 'External app',
  gatorgoodsEscrow: 'GatorGoods escrow',
};

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

export function normalizeListingStatus(status) {
  return LISTING_STATUS_LABELS[status] ? status : DEFAULT_LISTING_STATUS;
}

export function formatListingStatusLabel(status) {
  return LISTING_STATUS_LABELS[normalizeListingStatus(status)];
}

export function formatPercentLabel(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 'No data yet';
  }

  return `${Math.round(numericValue)}%`;
}

export function formatPaymentMethodLabel(value) {
  return PAYMENT_METHOD_LABELS[value] || 'Payment details pending';
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
  const pickupHubId = normalizePickupHubId(raw?.pickupHubId);

  return {
    id: raw?._id || raw?.id || '',
    title: normalizeText(raw?.itemName, DEFAULT_LISTING_TITLE),
    priceLabel: formatPriceLabel(raw?.itemCost),
    condition: normalizeText(raw?.itemCondition, 'Unknown'),
    location: getPickupHubLabel(pickupHubId, normalizeText(raw?.itemLocation, DEFAULT_LOCATION)),
    pickupHubId,
    pickupArea: getPickupHubArea(pickupHubId, normalizeText(raw?.pickupArea, '')),
    imageUrl: normalizeText(raw?.itemPicture, ''),
    category: normalizeCategory(raw?.itemCat),
    sellerName: normalizeText(raw?.userPublishingName, DEFAULT_SELLER_NAME),
    status: normalizeListingStatus(raw?.status),
    statusLabel: formatListingStatusLabel(raw?.status),
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
    pickupHubId: cardView.pickupHubId,
    pickupArea: cardView.pickupArea,
    imageUrl: cardView.imageUrl,
    category: cardView.category,
    description: normalizeText(raw?.itemDescription, 'No description provided yet.'),
    details: normalizeText(raw?.itemDetails, 'No additional details provided.'),
    status: cardView.status,
    statusLabel: cardView.statusLabel,
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
    participantAvatarUrl: normalizeText(profile?.profile?.profilePicture, ''),
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
    bannerUrl: normalizeText(profile?.profileBanner, ''),
    bio: normalizeText(profile?.profileBio, ''),
    instagramUrl: normalizeText(profile?.instagramUrl, ''),
    linkedinUrl: normalizeText(profile?.linkedinUrl, ''),
    ufVerified: Boolean(profile?.ufVerified),
    ratingLabel: Number.isFinite(ratingValue) && ratingValue > 0 ? `${ratingValue.toFixed(1)}/5` : 'New seller',
    listingCount,
    favoritesCount,
    isOwner: Boolean(viewerId && profile?.profileID && viewerId === profile.profileID),
  };
}

export function toTrustMetricsViewModel(rawProfile) {
  const profile = rawProfile?.profile || rawProfile || {};
  const trustMetrics = profile?.trustMetrics || {};

  return {
    overallRatingLabel:
      Number.isFinite(Number(profile?.profileRating)) && Number(profile.profileRating) > 0
        ? `${Number(profile.profileRating).toFixed(1)}/5`
        : 'New seller',
    totalRatings: Number(profile?.profileTotalRating) || 0,
    reliabilityLabel: formatPercentLabel(trustMetrics.reliability),
    accuracyLabel: formatPercentLabel(trustMetrics.accuracy),
    responsivenessLabel: formatPercentLabel(trustMetrics.responsiveness),
    safetyLabel: formatPercentLabel(trustMetrics.safety),
  };
}

export function toOfferCardViewModel(rawOffer, {listing, buyerProfile, sellerProfile} = {}) {
  const listingCard = listing ? toListingCardViewModel(listing) : null;
  const buyerTrust = buyerProfile ? toTrustMetricsViewModel(buyerProfile) : null;
  const sellerTrust = sellerProfile ? toTrustMetricsViewModel(sellerProfile) : null;
  const meetupHubId = normalizePickupHubId(rawOffer?.meetupHubId);

  return {
    id: rawOffer?._id || rawOffer?.id || '',
    listingId: rawOffer?.listingId || listingCard?.id || '',
    listingTitle: listingCard?.title || DEFAULT_LISTING_TITLE,
    listingStatus: listingCard?.status || DEFAULT_LISTING_STATUS,
    listingStatusLabel: listingCard?.statusLabel || formatListingStatusLabel(DEFAULT_LISTING_STATUS),
    buyerId: normalizeText(rawOffer?.buyerClerkUserId, ''),
    buyerName: normalizeText(
      buyerProfile?.profile?.profileName || buyerProfile?.profileName || rawOffer?.buyerDisplayName,
      'Buyer'
    ),
    sellerId: normalizeText(rawOffer?.sellerClerkUserId, ''),
    sellerName: normalizeText(
      sellerProfile?.profile?.profileName || sellerProfile?.profileName || listing?.userPublishingName,
      DEFAULT_SELLER_NAME
    ),
    offeredPrice: Number(rawOffer?.offeredPrice) || 0,
    offeredPriceLabel: formatPriceLabel(rawOffer?.offeredPrice),
    meetupLocation: getPickupHubLabel(meetupHubId, normalizeText(rawOffer?.meetupLocation, DEFAULT_LOCATION)),
    meetupHubId,
    meetupArea: getPickupHubArea(meetupHubId, normalizeText(rawOffer?.meetupArea, '')),
    meetupWindow: normalizeText(rawOffer?.meetupWindow, 'Meetup details pending'),
    paymentMethod: rawOffer?.paymentMethod || '',
    paymentMethodLabel: formatPaymentMethodLabel(rawOffer?.paymentMethod),
    message: normalizeText(rawOffer?.message, ''),
    status: normalizeText(rawOffer?.status, 'pending'),
    conversationId: rawOffer?.conversationId || '',
    buyerTrust,
    sellerTrust,
  };
}

export function groupOffersByListing(rawOffers, listingsById = {}) {
  return (Array.isArray(rawOffers) ? rawOffers : []).reduce((groups, offer) => {
    const listingId = offer?.listingId?.toString?.() || offer?.listingId || '';
    const listing = listingId ? listingsById[listingId] || null : null;
    const offerView = toOfferCardViewModel(offer, {listing});

    if (!groups[offerView.listingId]) {
      groups[offerView.listingId] = {
        listingId: offerView.listingId,
        listingTitle: offerView.listingTitle,
        listingStatus: offerView.listingStatus,
        listingStatusLabel: offerView.listingStatusLabel,
        offers: [],
      };
    }

    groups[offerView.listingId].offers.push(offerView);
    return groups;
  }, {});
}
