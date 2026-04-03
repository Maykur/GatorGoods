import {
  getPickupHubArea,
  getPickupHubLabel,
  normalizePickupHubId,
} from './pickupHubs';
import { getOfferMeetupScheduleLabel } from './meetupSchedule';

const DEFAULT_CATEGORY = 'Miscellaneous';
const DEFAULT_LOCATION = 'Campus pickup';
const DEFAULT_SELLER_NAME = 'GatorGoods Seller';
const DEFAULT_LISTING_TITLE = 'Untitled listing';
const DEFAULT_LISTING_STATUS = 'active';
const API_BASE_URL = 'http://localhost:5000';
const MAX_CONVERSATION_ITEM_TITLE_LENGTH = 25;
const MAX_CONVERSATION_PREVIEW_LENGTH = 75;
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

function normalizeImageUrl(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://') ||
    normalizedValue.startsWith('data:')
  ) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith('/')) {
    return `${API_BASE_URL}${normalizedValue}`;
  }

  return normalizedValue;
}

function getFirstName(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.split(/\s+/)[0];
}

function truncateText(value, maxLength) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (!Number.isFinite(maxLength) || maxLength <= 0 || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  if (maxLength <= 3) {
    return normalizedValue.slice(0, maxLength);
  }

  return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function getPublicListingPickup(raw) {
  const pickupHubId = normalizePickupHubId(raw?.originalPickupHubId || raw?.pickupHubId);
  const location = getPickupHubLabel(
    pickupHubId,
    normalizeText(raw?.originalItemLocation || raw?.itemLocation, DEFAULT_LOCATION)
  );
  const pickupArea = getPickupHubArea(
    pickupHubId,
    normalizeText(raw?.originalPickupArea || raw?.pickupArea, '')
  );

  return {
    pickupHubId,
    pickupArea,
    location,
  };
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

export function formatConversationTimestamp(value) {
  if (!value) {
    return 'No messages yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No messages yet';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function toListingCardViewModel(raw) {
  const publicPickup = getPublicListingPickup(raw);

  return {
    id: raw?._id || raw?.id || '',
    title: normalizeText(raw?.itemName, DEFAULT_LISTING_TITLE),
    priceLabel: formatPriceLabel(raw?.itemCost),
    condition: normalizeText(raw?.itemCondition, 'Unknown'),
    location: publicPickup.location,
    pickupHubId: publicPickup.pickupHubId,
    pickupArea: publicPickup.pickupArea,
    imageUrl: normalizeImageUrl(normalizeText(raw?.itemPictureUrl, normalizeText(raw?.itemPicture, ''))),
    category: normalizeCategory(raw?.itemCat),
    sellerName: normalizeText(raw?.userPublishingName, DEFAULT_SELLER_NAME),
    status: normalizeListingStatus(raw?.status),
    statusLabel: formatListingStatusLabel(raw?.status),
    offerId: raw?.reservedOfferId || '',
  };
}

export function getListingActualPickup(raw) {
  const pickupHubId = normalizePickupHubId(raw?.pickupHubId);

  return {
    pickupHubId,
    pickupArea: getPickupHubArea(pickupHubId, normalizeText(raw?.pickupArea, '')),
    location: getPickupHubLabel(pickupHubId, normalizeText(raw?.itemLocation, DEFAULT_LOCATION)),
  };
}

export function toListingDetailViewModel(raw, viewerId = null, sellerProfile = null) {
  const cardView = toListingCardViewModel(raw);
  const sellerId = normalizeText(raw?.userPublishingID, '');
  const normalizedSellerProfile = sellerProfile?.profile || sellerProfile || {};

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
      avatarUrl: normalizeImageUrl(normalizeText(normalizedSellerProfile?.profilePicture, '')),
    },
    isOwner: Boolean(viewerId && sellerId && sellerId === viewerId),
  };
}

export function toConversationPreviewViewModel(raw, profileOrViewerId, listing, maybeViewerId) {
  const viewerId = typeof maybeViewerId === 'string' ? maybeViewerId : profileOrViewerId;
  const profile = typeof maybeViewerId === 'string' ? profileOrViewerId : null;
  const lastReadAt =
    raw?.lastReadAtByUser?.[viewerId] ||
    (typeof raw?.lastReadAtByUser?.get === 'function' ? raw.lastReadAtByUser.get(viewerId) : null);
  const participantName = normalizeText(
    raw?.otherParticipant?.name,
    normalizeText(profile?.profile?.profileName, raw?.otherParticipantId || 'Conversation')
  );
  const linkedItems = Array.isArray(raw?.linkedItems) ? raw.linkedItems : [];
  const itemTitles = Array.from(
    new Set(
      (
        Array.isArray(raw?.itemPreviewTitles) && raw.itemPreviewTitles.length > 0
          ? raw.itemPreviewTitles
          : linkedItems.map((linkedItem) => linkedItem?.title).filter(Boolean)
      ).map((title) => normalizeText(title)).filter(Boolean)
    )
  );
  const activeItemTitle = normalizeText(raw?.activeItem?.title, normalizeText(listing?.itemName, 'General conversation'));
  const displayedItemTitles = itemTitles
    .slice(0, 3)
    .map((title) => truncateText(title, MAX_CONVERSATION_ITEM_TITLE_LENGTH));
  const linkedItemCount = Math.max(0, Number(raw?.linkedItemCount) || 0);
  const extraItemCount = Math.max(0, linkedItemCount - displayedItemTitles.length);
  const lastMessageText = normalizeText(raw?.lastMessageText, 'No messages yet');
  const lastMessageSenderId = normalizeText(raw?.lastMessageSenderClerkUserId, '');
  const lastMessageSenderLabel =
    lastMessageSenderId === 'system'
      ? 'Update'
      : lastMessageSenderId && viewerId && lastMessageSenderId === viewerId
        ? 'You'
        : getFirstName(participantName) || 'They';
  const fullLastMessagePreviewText =
    lastMessageText === 'No messages yet' ? lastMessageText : `${lastMessageSenderLabel}: ${lastMessageText}`;
  const truncatedActiveItemTitle = truncateText(activeItemTitle, MAX_CONVERSATION_ITEM_TITLE_LENGTH);

  return {
    id: raw?._id || '',
    participantName,
    participantAvatarUrl: normalizeText(raw?.otherParticipant?.avatarUrl, normalizeText(profile?.profile?.profilePicture, '')),
    listingName: truncatedActiveItemTitle,
    activeItemTitle: truncatedActiveItemTitle,
    fullActiveItemTitle: activeItemTitle,
    itemTitles: displayedItemTitles,
    itemTitlesLabel: displayedItemTitles.join(', '),
    fullItemTitlesLabel: itemTitles.slice(0, 3).join(', '),
    linkedItemCount,
    extraItemCount,
    lastMessageText,
    lastMessagePreviewText: truncateText(fullLastMessagePreviewText, MAX_CONVERSATION_PREVIEW_LENGTH),
    fullLastMessagePreviewText,
    lastMessageSenderLabel,
    lastMessageAtLabel: formatConversationTimestamp(raw?.lastMessageAt),
    hasSellingItems: linkedItems.some((linkedItem) => linkedItem?.relationshipRole === 'selling'),
    pendingItemCount: linkedItems.filter((linkedItem) => linkedItem?.state === 'pending').length,
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
  const meetupScheduleLabel = getOfferMeetupScheduleLabel(rawOffer);

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
    buyerAvatarUrl: normalizeText(
      buyerProfile?.profile?.profilePicture || buyerProfile?.profilePicture,
      ''
    ),
    sellerId: normalizeText(rawOffer?.sellerClerkUserId, ''),
    sellerName: normalizeText(
      sellerProfile?.profile?.profileName || sellerProfile?.profileName || listing?.userPublishingName,
      DEFAULT_SELLER_NAME
    ),
    sellerAvatarUrl: normalizeText(
      sellerProfile?.profile?.profilePicture || sellerProfile?.profilePicture,
      ''
    ),
    offeredPrice: Number(rawOffer?.offeredPrice) || 0,
    offeredPriceLabel: formatPriceLabel(rawOffer?.offeredPrice),
    meetupLocation: getPickupHubLabel(meetupHubId, normalizeText(rawOffer?.meetupLocation, DEFAULT_LOCATION)),
    meetupHubId,
    meetupArea: getPickupHubArea(meetupHubId, normalizeText(rawOffer?.meetupArea, '')),
    meetupDate: normalizeText(rawOffer?.meetupDate, ''),
    meetupTime: normalizeText(rawOffer?.meetupTime, ''),
    meetupScheduleLabel,
    meetupWindow: meetupScheduleLabel,
    paymentMethod: rawOffer?.paymentMethod || '',
    paymentMethodLabel: formatPaymentMethodLabel(rawOffer?.paymentMethod),
    listingImageUrl: listingCard?.imageUrl || '',
    message: normalizeText(rawOffer?.message, ''),
    status: normalizeText(rawOffer?.status, 'pending'),
    conversationId: rawOffer?.conversationId || '',
    buyerTrust,
    sellerTrust,
  };
}

export function toTransactionViewModel(rawTransaction, {listing, buyerProfile, sellerProfile} = {}) {
  const acceptedTerms = rawTransaction?.acceptedTerms || {};
  const transactionOfferLike = {
    _id: rawTransaction?._id || '',
    listingId: rawTransaction?.listingId || '',
    buyerClerkUserId: rawTransaction?.buyerClerkUserId || '',
    buyerDisplayName: buyerProfile?.profile?.profileName || buyerProfile?.profileName || 'Buyer',
    sellerClerkUserId: rawTransaction?.sellerClerkUserId || '',
    conversationId: rawTransaction?.conversationId || '',
    offeredPrice: acceptedTerms?.price,
    meetupHubId: acceptedTerms?.meetupHubId || '',
    meetupLocation: acceptedTerms?.meetupLocation || '',
    meetupDate: acceptedTerms?.meetupDate || '',
    meetupTime: acceptedTerms?.meetupTime || '',
    paymentMethod: acceptedTerms?.paymentMethod || '',
    status: rawTransaction?.status || 'scheduled',
  };
  const offerView = toOfferCardViewModel(transactionOfferLike, {
    listing,
    buyerProfile,
    sellerProfile,
  });

  return {
    ...offerView,
    transactionId: rawTransaction?._id || '',
    offerId: rawTransaction?.offerId || '',
    acceptedTerms: {
      price: Number(acceptedTerms?.price) || 0,
      paymentMethod: acceptedTerms?.paymentMethod || '',
      meetupHubId: acceptedTerms?.meetupHubId || '',
      meetupLocation: acceptedTerms?.meetupLocation || '',
      pickupSpecifics: normalizeText(acceptedTerms?.pickupSpecifics, ''),
      meetupDate: acceptedTerms?.meetupDate || '',
      meetupTime: acceptedTerms?.meetupTime || '',
    },
    pickupSpecifics: normalizeText(acceptedTerms?.pickupSpecifics, ''),
    buyerDecision: normalizeText(rawTransaction?.buyerDecision, ''),
    sellerDecision: normalizeText(rawTransaction?.sellerDecision, ''),
    buyerReviewedAt: rawTransaction?.buyerReviewedAt || null,
    sellerReviewedAt: rawTransaction?.sellerReviewedAt || null,
    createdAt: rawTransaction?.createdAt || null,
    updatedAt: rawTransaction?.updatedAt || null,
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
