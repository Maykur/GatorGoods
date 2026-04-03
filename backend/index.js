// REFERENCE: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const {
  deriveListingPickupFields,
  deriveOfferPickupFields,
  getPickupHubById,
  isApprovedPickupLocationLabel,
  findPickupHubByLabel,
} = require('../src/lib/pickupHubs');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const MIN_PICKUP_SPECIFICS_LENGTH = 8;
const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  externalApp: 'External app',
  gatorgoodsEscrow: 'GatorGoods escrow',
};

const ItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  itemCost: {
    type: String,
    required: true,
  },
  itemCondition: {
    type: String,
    required: true,
  },
  itemLocation: {
    type: String,
    required: true,
  },
  pickupHubId: {
    type: String,
    default: null,
    trim: true,
  },
  originalPickupHubId: {
    type: String,
    default: null,
    trim: true,
  },
  pickupArea: {
    type: String,
    default: '',
    trim: true,
  },
  originalPickupArea: {
    type: String,
    default: '',
    trim: true,
  },
  originalItemLocation: {
    type: String,
    default: '',
    trim: true,
  },
  itemPicture: {
    type: String,
    required: true,
  },
  itemDescription: {
    type: String,
    required: true,
  },
  itemDetails: {
    type: String,
    required: true,
  },
  userPublishingID: {
    type: String,
    required: true,
  },
  userPublishingName: {
    type: String,
    required: true,
  },
  itemCat: {
    type: String,
    default: "Miscellaneous",
  },
  status: {
    type: String,
    enum: ['active', 'reserved', 'sold', 'archived'],
    default: 'active',
  },
  reservedOfferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offers',
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  seedTag: {
    type: String,
    default: null,
  },
});

const profileSchema = new mongoose.Schema({
  profileName: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    default: '',
  },
  profileBanner: {
    type: String,
    default: '',
  },
  profileBio: {
    type: String,
    default: '',
  },
  instagramUrl: {
    type: String,
    default: '',
  },
  linkedinUrl: {
    type: String,
    default: '',
  },
  ufVerified: {
    type: Boolean,
    default: false,
  },
  profileRating: {
    type: Number,
    default: 0,
    required: true,
  },
  profileTotalRating: {
    type: Number,
    default: 0,
  },
  profileID: {
    type: String,
    required: true,
  },
  profileFavorites: {
    type: [String],
    default: [],
  },
  trustMetrics: {
    reliability: {
      type: Number,
      default: null,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    responsiveness: {
      type: Number,
      default: null,
    },
    safety: {
      type: Number,
      default: null,
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
  seedTag: {
    type: String,
    default: null,
  },
});

const conversationSchema = new mongoose.Schema(
  {
    participantIds: {
      type: [String],
      required: true,
      validate: {
        validator: (participants) => Array.isArray(participants) && participants.length === 2,
        message: 'A conversation must have exactly two participants.',
      },
    },
    linkedListingIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'items',
      default: [],
    },
    activeListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'items',
      default: null,
    },
    linkedItems: {
      type: [
        new mongoose.Schema(
          {
            listingId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'items',
              required: true,
            },
            title: {
              type: String,
              default: '',
              trim: true,
            },
            imageUrl: {
              type: String,
              default: '',
              trim: true,
            },
            firstLinkedAt: {
              type: Date,
              default: null,
            },
            lastContextAt: {
              type: Date,
              default: null,
            },
            firstContextMessageId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'messages',
              default: null,
            },
            latestContextMessageId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'messages',
              default: null,
            },
            lastKnownStatus: {
              type: String,
              default: '',
              trim: true,
            },
          },
          {_id: false}
        ),
      ],
      default: [],
    },
    activePickupHubId: {
      type: String,
      default: null,
      trim: true,
    },
    activePickupSpecifics: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastReadAtByUser: {
      type: Map,
      of: Date,
      default: {},
    },
    seedTag: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({participantIds: 1, lastMessageAt: -1});

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'conversations',
      required: true,
      index: true,
    },
    senderClerkUserId: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    attachedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'items',
      default: null,
    },
    attachedListingTitle: {
      type: String,
      default: '',
      trim: true,
    },
    attachedListingImageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    offerSnapshot: {
      type: new mongoose.Schema(
        {
          offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'offers',
            default: null,
          },
          eventType: {
            type: String,
            enum: ['sent', 'accepted', 'declined'],
            default: '',
            trim: true,
          },
          status: {
            type: String,
            default: '',
            trim: true,
          },
          offeredPrice: {
            type: Number,
            default: null,
          },
          buyerClerkUserId: {
            type: String,
            default: '',
            trim: true,
          },
          buyerDisplayName: {
            type: String,
            default: '',
            trim: true,
          },
          sellerClerkUserId: {
            type: String,
            default: '',
            trim: true,
          },
          paymentMethod: {
            type: String,
            default: '',
            trim: true,
          },
          meetupHubId: {
            type: String,
            default: '',
            trim: true,
          },
          meetupLocation: {
            type: String,
            default: '',
            trim: true,
          },
        },
        {_id: false}
      ),
      default: null,
    },
    seedTag: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({conversationId: 1, createdAt: 1});

const offerSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'items',
      required: true,
      index: true,
    },
    buyerClerkUserId: {
      type: String,
      required: true,
      trim: true,
    },
    buyerDisplayName: {
      type: String,
      default: 'Buyer',
      trim: true,
    },
    sellerClerkUserId: {
      type: String,
      required: true,
      trim: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'conversations',
      default: null,
    },
    offeredPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    meetupLocation: {
      type: String,
      required: true,
      trim: true,
    },
    meetupHubId: {
      type: String,
      default: null,
      trim: true,
    },
    meetupArea: {
      type: String,
      default: '',
      trim: true,
    },
    meetupWindow: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'externalApp', 'gatorgoodsEscrow'],
      required: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'countered', 'convertedToTransaction'],
      default: 'pending',
      index: true,
    },
    seedTag: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({sellerClerkUserId: 1, status: 1, createdAt: -1});
offerSchema.index({buyerClerkUserId: 1, status: 1, createdAt: -1});

const Item = mongoose.models.items || mongoose.model('items', ItemSchema);
const Profile = mongoose.models.profiles || mongoose.model('profiles', profileSchema);
const Conversation = mongoose.models.conversations || mongoose.model('conversations', conversationSchema);
const Message = mongoose.models.messages || mongoose.model('messages', messageSchema);
const Offer = mongoose.models.offers || mongoose.model('offers', offerSchema);

function clampPositiveInteger(value, fallback, max = null) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  if (max && parsedValue > max) {
    return max;
  }

  return parsedValue;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getItemsSort(sort) {
  switch (sort) {
    case 'title':
      return {itemName: 1, _id: -1};
    case 'price-low':
      return {itemCostNumeric: 1, _id: -1};
    case 'price-high':
      return {itemCostNumeric: -1, _id: -1};
    default:
      return {date: -1, _id: -1};
  }
}

const ITEM_FEED_SELECT =
  'itemName itemCost itemCondition itemLocation pickupHubId originalPickupHubId pickupArea ' +
  'originalPickupArea originalItemLocation userPublishingName itemCat status date';

function buildItemImageUrl(itemId) {
  const normalizedItemId = toIdString(itemId);

  if (!normalizedItemId) {
    return '';
  }

  return `/items/${normalizedItemId}/image`;
}

function buildItemFeedSummary(rawItem) {
  const item = rawItem?.toObject ? rawItem.toObject() : rawItem;
  const itemId = toIdString(item?._id || item?.id);

  return {
    _id: itemId,
    itemName: item?.itemName || '',
    itemCost: item?.itemCost || '',
    itemCondition: item?.itemCondition || '',
    itemLocation: item?.itemLocation || '',
    pickupHubId: item?.pickupHubId || null,
    originalPickupHubId: item?.originalPickupHubId || null,
    pickupArea: item?.pickupArea || '',
    originalPickupArea: item?.originalPickupArea || '',
    originalItemLocation: item?.originalItemLocation || '',
    userPublishingName: item?.userPublishingName || '',
    itemCat: item?.itemCat || '',
    status: item?.status || 'active',
    date: item?.date || null,
    itemPictureUrl: buildItemImageUrl(itemId),
  };
}

function parseDataUrl(value = '') {
  const match = value.match(/^data:([^;,]+)?((?:;[^,]*)*?),(.*)$/s);

  if (!match) {
    return null;
  }

  const mimeType = match[1] || 'application/octet-stream';
  const metadata = match[2] || '';
  const payload = match[3] || '';
  const isBase64 = /;base64/i.test(metadata);

  return {
    mimeType,
    data: isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8'),
  };
}

async function connectToDatabase(uri = process.env.mongo_url) {
  if (!uri) {
    throw new Error('mongo_url is required');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectFromDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

async function clearDatabase() {
  const {collections} = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

function normalizeParticipantIds(participantIds = []) {
  return [...new Set(participantIds.map((participantId) => participantId?.trim()).filter(Boolean))].sort();
}

async function findConversationByParticipantIds(participantIds = []) {
  const normalizedParticipantIds = normalizeParticipantIds(participantIds);

  if (normalizedParticipantIds.length !== 2) {
    return null;
  }

  return Conversation.findOne({
    participantIds: normalizedParticipantIds,
  }).sort({lastMessageAt: -1, updatedAt: -1, _id: -1});
}

function toIdString(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toString();
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function dedupeIdStrings(values = []) {
  const seen = new Set();
  const dedupedValues = [];

  values.forEach((value) => {
    const id = toIdString(value);

    if (!id || seen.has(id)) {
      return;
    }

    seen.add(id);
    dedupedValues.push(id);
  });

  return dedupedValues;
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function getFirstName(value) {
  const trimmedValue = normalizeOptionalString(value);

  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.split(/\s+/)[0];
}

function normalizeLinkedItemForComparison(linkedItem = {}) {
  return {
    listingId: toIdString(linkedItem.listingId),
    title: linkedItem.title || '',
    imageUrl: linkedItem.imageUrl || '',
    firstLinkedAt: normalizeDateValue(linkedItem.firstLinkedAt)?.toISOString() || null,
    lastContextAt: normalizeDateValue(linkedItem.lastContextAt)?.toISOString() || null,
    firstContextMessageId: toIdString(linkedItem.firstContextMessageId) || null,
    latestContextMessageId: toIdString(linkedItem.latestContextMessageId) || null,
    lastKnownStatus: linkedItem.lastKnownStatus || '',
  };
}

function areIdListsEqual(currentValues = [], nextValues = []) {
  if (currentValues.length !== nextValues.length) {
    return false;
  }

  return currentValues.every((value, index) => value === nextValues[index]);
}

function areLinkedItemListsEqual(currentValues = [], nextValues = []) {
  if (currentValues.length !== nextValues.length) {
    return false;
  }

  return currentValues.every((linkedItem, index) => {
    const currentValue = JSON.stringify(normalizeLinkedItemForComparison(linkedItem));
    const nextValue = JSON.stringify(normalizeLinkedItemForComparison(nextValues[index]));
    return currentValue === nextValue;
  });
}

async function fetchListingsByIds(listingIds = [], {select = '', lean = false} = {}) {
  const normalizedListingIds = dedupeIdStrings(listingIds)
    .map((listingId) => toObjectId(listingId))
    .filter(Boolean);

  if (normalizedListingIds.length === 0) {
    return new Map();
  }

  let query = Item.find({
    _id: {$in: normalizedListingIds},
  });

  if (select) {
    query = query.select(select);
  }

  if (lean) {
    query = query.lean();
  }

  const listings = await query;

  return new Map(listings.map((listing) => [toIdString(listing?._id || listing?.id), listing]));
}

function buildAttachedListingSnapshot(listing, fallback = {}) {
  return {
    attachedListingTitle: listing?.itemName || normalizeOptionalString(fallback.title) || '',
    attachedListingImageUrl: listing?.itemPicture || normalizeOptionalString(fallback.imageUrl) || '',
  };
}

async function buildAttachedListingMessageFields(attachedListingId, fallback = {}) {
  const normalizedListingId = toObjectId(attachedListingId);

  if (!normalizedListingId) {
    return {
      attachedListingId: null,
      attachedListingTitle: '',
      attachedListingImageUrl: '',
      listing: null,
    };
  }

  const listing = await Item.findById(normalizedListingId);

  return {
    attachedListingId: normalizedListingId,
    ...buildAttachedListingSnapshot(listing, fallback),
    listing,
  };
}

async function createOfferSystemMessage({
  conversationId,
  listingId,
  offer,
  eventType,
}) {
  const attachedListingFields = await buildAttachedListingMessageFields(listingId);
  const offerSnapshot = buildOfferSnapshot(offer, {eventType});

  return Message.create({
    conversationId,
    senderClerkUserId: 'system',
    body: `${getOfferEventBody(eventType, offerSnapshot)}.`,
    attachedListingId: attachedListingFields.attachedListingId,
    attachedListingTitle: attachedListingFields.attachedListingTitle,
    attachedListingImageUrl: attachedListingFields.attachedListingImageUrl,
    offerSnapshot,
  });
}

async function repairConversationLinkedItems(
  conversation,
  {
    messages = null,
    touchedListingId = null,
    contextAt = null,
    contextMessageId = null,
    fallbackTitle = '',
    fallbackImageUrl = '',
    fallbackStatus = '',
  } = {}
) {
  if (!conversation?._id) {
    return {changed: false, messages: Array.isArray(messages) ? messages : []};
  }

  const normalizedTouchedListingId = toIdString(touchedListingId);
  const normalizedContextAt = normalizeDateValue(contextAt);
  const normalizedContextMessageId = toObjectId(contextMessageId);
  const orderedMessages = Array.isArray(messages)
    ? [...messages].sort((firstMessage, secondMessage) => firstMessage.createdAt - secondMessage.createdAt)
    : await Message.find({conversationId: conversation._id}).sort({createdAt: 1});
  const existingLinkedItems = Array.isArray(conversation.linkedItems)
    ? conversation.linkedItems.map((linkedItem) => (linkedItem?.toObject ? linkedItem.toObject() : linkedItem))
    : [];
  const existingLinkedItemsById = new Map(
    existingLinkedItems
      .map((linkedItem) => [toIdString(linkedItem.listingId), linkedItem])
      .filter(([listingId]) => Boolean(listingId))
  );
  const messageContextByListingId = new Map();

  orderedMessages.forEach((message) => {
    const listingId = toIdString(message.attachedListingId);

    if (!listingId) {
      return;
    }

    const existingContext = messageContextByListingId.get(listingId);

    if (!existingContext) {
      messageContextByListingId.set(listingId, {
        firstLinkedAt: message.createdAt,
        lastContextAt: message.createdAt,
        firstContextMessageId: message._id,
        latestContextMessageId: message._id,
        title: message.attachedListingTitle || '',
        imageUrl: message.attachedListingImageUrl || '',
      });
      return;
    }

    existingContext.lastContextAt = message.createdAt;
    existingContext.latestContextMessageId = message._id;
    existingContext.title = message.attachedListingTitle || existingContext.title || '';
    existingContext.imageUrl = message.attachedListingImageUrl || existingContext.imageUrl || '';
  });

  const canonicalListingIds = dedupeIdStrings([
    ...(conversation.linkedListingIds || []),
    conversation.activeListingId,
    ...existingLinkedItems.map((linkedItem) => linkedItem.listingId),
    ...messageContextByListingId.keys(),
    normalizedTouchedListingId,
  ]);
  const liveListingsById = await fetchListingsByIds(canonicalListingIds);
  const fallbackLinkedAt = conversation.createdAt || new Date();
  const fallbackContextAt = normalizeDateValue(conversation.updatedAt) || fallbackLinkedAt;

  const nextLinkedItems = canonicalListingIds
    .map((listingId) => {
      const existingLinkedItem = existingLinkedItemsById.get(listingId) || {};
      const messageContext = messageContextByListingId.get(listingId);
      const liveListing = liveListingsById.get(listingId);
      const firstLinkedAt =
        normalizeDateValue(existingLinkedItem.firstLinkedAt) ||
        normalizeDateValue(messageContext?.firstLinkedAt) ||
        fallbackLinkedAt;
      let lastContextAt =
        normalizeDateValue(messageContext?.lastContextAt) ||
        normalizeDateValue(existingLinkedItem.lastContextAt) ||
        firstLinkedAt ||
        fallbackContextAt;

      if (listingId === normalizedTouchedListingId && normalizedContextAt && normalizedContextAt > lastContextAt) {
        lastContextAt = normalizedContextAt;
      }

      const firstContextMessageId =
        toObjectId(messageContext?.firstContextMessageId) ||
        toObjectId(existingLinkedItem.firstContextMessageId) ||
        (listingId === normalizedTouchedListingId ? normalizedContextMessageId : null);
      const latestContextMessageId =
        (listingId === normalizedTouchedListingId && normalizedContextMessageId) ||
        toObjectId(messageContext?.latestContextMessageId) ||
        toObjectId(existingLinkedItem.latestContextMessageId) ||
        null;

      return {
        listingId: toObjectId(listingId),
        title:
          liveListing?.itemName ||
          existingLinkedItem.title ||
          messageContext?.title ||
          (listingId === normalizedTouchedListingId ? fallbackTitle : '') ||
          '',
        imageUrl:
          liveListing?.itemPicture ||
          existingLinkedItem.imageUrl ||
          messageContext?.imageUrl ||
          (listingId === normalizedTouchedListingId ? fallbackImageUrl : '') ||
          '',
        firstLinkedAt,
        lastContextAt,
        firstContextMessageId,
        latestContextMessageId,
        lastKnownStatus:
          liveListing?.status ||
          (listingId === normalizedTouchedListingId ? fallbackStatus : '') ||
          existingLinkedItem.lastKnownStatus ||
          'deleted',
      };
    })
    .sort((firstItem, secondItem) => {
      const firstTimestamp = normalizeDateValue(firstItem.firstLinkedAt)?.getTime() || 0;
      const secondTimestamp = normalizeDateValue(secondItem.firstLinkedAt)?.getTime() || 0;
      return firstTimestamp - secondTimestamp;
    });
  const nextLinkedListingIds = canonicalListingIds;
  const currentLinkedListingIds = dedupeIdStrings(conversation.linkedListingIds || []);
  const currentLinkedItems = existingLinkedItems;
  const linkedListingIdsChanged = !areIdListsEqual(currentLinkedListingIds, nextLinkedListingIds);
  const linkedItemsChanged = !areLinkedItemListsEqual(currentLinkedItems, nextLinkedItems);

  if (linkedListingIdsChanged) {
    conversation.linkedListingIds = nextLinkedListingIds
      .map((listingId) => toObjectId(listingId))
      .filter(Boolean);
  }

  if (linkedItemsChanged) {
    conversation.linkedItems = nextLinkedItems;
  }

  return {
    changed: linkedListingIdsChanged || linkedItemsChanged,
    messages: orderedMessages,
  };
}

function normalizePickupSpecifics(value) {
  return normalizeOptionalString(value);
}

function isValidPickupSpecifics(value) {
  return value.length >= MIN_PICKUP_SPECIFICS_LENGTH;
}

async function getConversationListing(conversation) {
  if (!conversation?.activeListingId) {
    return null;
  }

  return Item.findById(conversation.activeListingId);
}

function deriveOriginalListingPickupFields(item = {}) {
  return deriveListingPickupFields({
    pickupHubId: item.originalPickupHubId || item.pickupHubId,
    itemLocation: item.originalItemLocation || item.itemLocation,
  });
}

function deriveCurrentListingPickupFields(item = {}) {
  return deriveListingPickupFields({
    pickupHubId: item.pickupHubId,
    itemLocation: item.itemLocation,
  });
}

function applyOriginalListingPickupFields(item, resolvedPickupFields) {
  item.originalPickupHubId = resolvedPickupFields.pickupHubId;
  item.originalPickupArea = resolvedPickupFields.pickupArea;
  item.originalItemLocation = resolvedPickupFields.itemLocation;
}

function applyCurrentListingPickupFields(item, resolvedPickupFields) {
  item.pickupHubId = resolvedPickupFields.pickupHubId;
  item.pickupArea = resolvedPickupFields.pickupArea;
  item.itemLocation = resolvedPickupFields.itemLocation;
}

function ensureListingOriginalPickupFields(item) {
  const originalPickupFields = deriveOriginalListingPickupFields(item);

  if (!item.originalPickupHubId && originalPickupFields.pickupHubId) {
    item.originalPickupHubId = originalPickupFields.pickupHubId;
  }

  if (!item.originalPickupArea && originalPickupFields.pickupArea) {
    item.originalPickupArea = originalPickupFields.pickupArea;
  }

  if (!item.originalItemLocation && originalPickupFields.itemLocation) {
    item.originalItemLocation = originalPickupFields.itemLocation;
  }
}

async function syncReservedConversationListingPickup(conversation, pickupHubId) {
  if (!conversation?.activeListingId) {
    return null;
  }

  const listing = await Item.findById(conversation.activeListingId);

  if (!listing || !listing.reservedOfferId) {
    return listing;
  }

  const reservedOffer = await Offer.findById(listing.reservedOfferId);

  if (!reservedOffer || reservedOffer.conversationId?.toString() !== conversation._id.toString()) {
    return listing;
  }

  ensureListingOriginalPickupFields(listing);
  applyCurrentListingPickupFields(
    listing,
    deriveListingPickupFields({
      pickupHubId,
      itemLocation: getPickupHubById(pickupHubId)?.label || listing.itemLocation,
    })
  );
  await listing.save();

  return listing;
}

async function getReservedOfferForConversation(conversation) {
  if (!conversation?.activeListingId) {
    return {listing: null, reservedOffer: null};
  }

  const listing = await Item.findById(conversation.activeListingId);

  if (!listing?.reservedOfferId) {
    return {listing, reservedOffer: null};
  }

  const reservedOffer = await Offer.findById(listing.reservedOfferId);

  if (!reservedOffer || reservedOffer.conversationId?.toString() !== conversation._id.toString()) {
    return {listing, reservedOffer: null};
  }

  return {listing, reservedOffer};
}

async function repairConversationPickupHub(conversation) {
  if (!conversation || conversation.activePickupHubId) {
    return conversation;
  }

  const {listing, reservedOffer} = await getReservedOfferForConversation(conversation);

  if (reservedOffer) {
    const resolvedOfferPickup = deriveOfferPickupFields({
      meetupHubId: reservedOffer.meetupHubId,
      meetupLocation: reservedOffer.meetupLocation,
    });

    if (resolvedOfferPickup.meetupHubId) {
      conversation.activePickupHubId = resolvedOfferPickup.meetupHubId;
      await conversation.save();
      return conversation;
    }
  }

  if (conversation.activePickupSpecifics && listing?.pickupHubId) {
    conversation.activePickupHubId = listing.pickupHubId;
    await conversation.save();
  }

  return conversation;
}

async function buildLinkedItemStateMaps(linkedItems = [], conversationId) {
  const listingIds = dedupeIdStrings(linkedItems.map((linkedItem) => linkedItem.listingId));
  const liveListingsById = await fetchListingsByIds(listingIds);
  const reservedOfferIds = dedupeIdStrings(
    listingIds.map((listingId) => liveListingsById.get(listingId)?.reservedOfferId).filter(Boolean)
  )
    .map((offerId) => toObjectId(offerId))
    .filter(Boolean);
  const reservedOffers = reservedOfferIds.length > 0
    ? await Offer.find({
      _id: {$in: reservedOfferIds},
    })
    : [];
  const reservedOffersById = new Map(reservedOffers.map((offer) => [offer.id, offer]));
  const reservedOffersByListingId = new Map();
  const threadOffers = listingIds.length > 0
    ? await Offer.find({
      listingId: {$in: listingIds.map((listingId) => toObjectId(listingId)).filter(Boolean)},
      conversationId: toObjectId(conversationId),
      status: {$in: ['pending', 'accepted']},
    }).sort({createdAt: -1, _id: -1})
    : [];
  const threadOffersByListingId = new Map();

  listingIds.forEach((listingId) => {
    const listing = liveListingsById.get(listingId);
    const reservedOffer = listing?.reservedOfferId
      ? reservedOffersById.get(toIdString(listing.reservedOfferId)) || null
      : null;

    reservedOffersByListingId.set(listingId, reservedOffer);
  });

  threadOffers.forEach((offer) => {
    const listingId = toIdString(offer.listingId);
    const existingOffer = threadOffersByListingId.get(listingId);

    if (!existingOffer || (offer.status === 'accepted' && existingOffer.status !== 'accepted')) {
      threadOffersByListingId.set(listingId, offer);
    }
  });

  return {
    liveListingsById,
    reservedOffersByListingId,
    threadOffersByListingId,
    conversationId: toIdString(conversationId),
  };
}

function deriveLinkedItemState({listing, reservedOffer, conversationId}) {
  if (!listing) {
    return 'unavailable';
  }

  if (listing.status === 'active') {
    return 'active';
  }

  const reservedHere = Boolean(
    reservedOffer &&
    toIdString(reservedOffer.conversationId) &&
    toIdString(reservedOffer.conversationId) === toIdString(conversationId)
  );

  if (listing.status === 'reserved') {
    return reservedHere ? 'pending' : 'unavailable';
  }

  if (listing.status === 'sold') {
    return reservedHere ? 'completedHere' : 'unavailable';
  }

  return 'unavailable';
}

function deriveLinkedItemRelationshipRole({listing, reservedOffer, viewerParticipantId}) {
  const sellerId = listing?.userPublishingID || reservedOffer?.sellerClerkUserId || '';
  const normalizedSellerId = toIdString(sellerId);
  const normalizedViewerId = toIdString(viewerParticipantId);

  if (!normalizedSellerId || !normalizedViewerId) {
    return null;
  }

  return normalizedSellerId === normalizedViewerId ? 'selling' : 'buying';
}

function formatOfferPriceLabel(value) {
  if (!Number.isFinite(Number(value))) {
    return '';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatPaymentMethodLabel(paymentMethod) {
  return PAYMENT_METHOD_LABELS[paymentMethod] || '';
}

function getOfferMeetupLabel(offer = {}) {
  return getPickupHubById(offer.meetupHubId)?.label || offer.meetupLocation || '';
}

function buildOfferDetailLine(offer = {}) {
  const parts = [
    formatOfferPriceLabel(offer.offeredPrice),
    formatPaymentMethodLabel(offer.paymentMethod),
    getOfferMeetupLabel(offer),
  ].filter(Boolean);

  return parts.join(' • ');
}

function getOfferEventTitle(eventType, offerSnapshot = {}, viewerParticipantId = '') {
  if (eventType === 'sent') {
    const normalizedViewerId = toIdString(viewerParticipantId);
    const normalizedBuyerId = toIdString(offerSnapshot.buyerClerkUserId);
    const buyerName = getFirstName(offerSnapshot.buyerDisplayName) || 'Buyer';

    if (normalizedViewerId && normalizedViewerId === normalizedBuyerId) {
      return 'You sent an offer';
    }

    return `${buyerName} sent an offer`;
  }

  if (eventType === 'accepted') {
    const normalizedViewerId = toIdString(viewerParticipantId);
    const normalizedSellerId = toIdString(offerSnapshot.sellerClerkUserId);
    const buyerName = getFirstName(offerSnapshot.buyerDisplayName) || 'the buyer';
    const sellerName = getFirstName(offerSnapshot.sellerDisplayName) || 'Seller';

    if (normalizedViewerId && normalizedViewerId === normalizedSellerId) {
      return `You accepted ${buyerName}'s offer`;
    }

    return `${sellerName} accepted your offer`;
  }

  if (eventType === 'declined') {
    const normalizedViewerId = toIdString(viewerParticipantId);
    const normalizedSellerId = toIdString(offerSnapshot.sellerClerkUserId);
    const buyerName = getFirstName(offerSnapshot.buyerDisplayName) || 'the buyer';
    const sellerName = getFirstName(offerSnapshot.sellerDisplayName) || 'Seller';

    if (normalizedViewerId && normalizedViewerId === normalizedSellerId) {
      return `You rejected ${buyerName}'s offer`;
    }

    return `${sellerName} rejected your offer`;
  }

  return 'Offer sent';
}

function getOfferEventBody(eventType, offerSnapshot = {}) {
  if (eventType === 'sent') {
    return `${offerSnapshot.buyerDisplayName || 'Buyer'} sent an offer`;
  }

  return getOfferEventTitle(eventType, offerSnapshot);
}

function resolveBuyerDisplayName(offerSnapshot = {}, participantNamesById = new Map()) {
  const storedName = normalizeOptionalString(offerSnapshot.buyerDisplayName);

  if (storedName && storedName.toLowerCase() !== 'buyer') {
    return storedName;
  }

  return getFirstName(participantNamesById.get(toIdString(offerSnapshot.buyerClerkUserId))) || getFirstName(storedName) || 'Buyer';
}

function resolveSellerDisplayName(offerSnapshot = {}, participantNamesById = new Map()) {
  return getFirstName(participantNamesById.get(toIdString(offerSnapshot.sellerClerkUserId))) || 'Seller';
}

function buildOfferSnapshot(offer, {eventType = ''} = {}) {
  if (!offer) {
    return null;
  }

  return {
    offerId: offer._id || offer.offerId || null,
    eventType,
    status: offer.status || '',
    offeredPrice: Number.isFinite(Number(offer.offeredPrice)) ? Number(offer.offeredPrice) : null,
    buyerClerkUserId: offer.buyerClerkUserId || '',
    buyerDisplayName: offer.buyerDisplayName || '',
    sellerClerkUserId: offer.sellerClerkUserId || '',
    paymentMethod: offer.paymentMethod || '',
    meetupHubId: offer.meetupHubId || '',
    meetupLocation: offer.meetupLocation || '',
  };
}

function buildOfferApiSummary(
  offerSnapshot,
  {
    includeEventTitle = false,
    viewerParticipantId = '',
    participantNamesById = new Map(),
  } = {}
) {
  if (!offerSnapshot) {
    return null;
  }

  const buyerDisplayName = resolveBuyerDisplayName(offerSnapshot, participantNamesById);
  const sellerDisplayName = resolveSellerDisplayName(offerSnapshot, participantNamesById);

  const detailLine =
    offerSnapshot.eventType === 'declined'
      ? ''
      : buildOfferDetailLine(offerSnapshot);

  return {
    offerId: toIdString(offerSnapshot.offerId),
    eventType: offerSnapshot.eventType || '',
    status: offerSnapshot.status || '',
    offeredPrice: Number.isFinite(Number(offerSnapshot.offeredPrice))
      ? Number(offerSnapshot.offeredPrice)
      : null,
    buyerDisplayName,
    sellerDisplayName,
    paymentMethod: offerSnapshot.paymentMethod || '',
    paymentMethodLabel: formatPaymentMethodLabel(offerSnapshot.paymentMethod),
    meetupHubId: offerSnapshot.meetupHubId || '',
    meetupLocation: offerSnapshot.meetupLocation || '',
    meetupLabel: getOfferMeetupLabel(offerSnapshot),
    detailLine,
    ...(includeEventTitle
      ? {
          title: getOfferEventTitle(
            offerSnapshot.eventType,
            {
              ...offerSnapshot,
              buyerDisplayName,
              sellerDisplayName,
            },
            viewerParticipantId
          ),
        }
      : {}),
  };
}

function buildLinkedItemCurrentOfferSummary(offer) {
  if (!offer || !['pending', 'accepted'].includes(offer.status)) {
    return null;
  }

  return {
    status: offer.status,
    title: offer.status === 'accepted' ? 'Offer accepted' : 'Offer pending',
    ...buildOfferApiSummary(buildOfferSnapshot(offer), {
      includeEventTitle: false,
    }),
  };
}

function buildConversationPreviewLinkedItemSeeds(conversationObject = {}) {
  const storedLinkedItems = Array.isArray(conversationObject.linkedItems) ? conversationObject.linkedItems : [];
  const storedLinkedItemsById = new Map(
    storedLinkedItems
      .map((linkedItem) => [toIdString(linkedItem?.listingId), linkedItem])
      .filter(([listingId]) => Boolean(listingId))
  );
  const canonicalListingIds = dedupeIdStrings([
    ...storedLinkedItems.map((linkedItem) => linkedItem?.listingId),
    ...(conversationObject.linkedListingIds || []),
    conversationObject.activeListingId,
  ]);

  return canonicalListingIds.map((listingId) => {
    const storedLinkedItem = storedLinkedItemsById.get(listingId);

    if (storedLinkedItem) {
      return storedLinkedItem;
    }

    return {
      listingId,
      title: '',
      lastContextAt: conversationObject.lastMessageAt || null,
      lastKnownStatus: '',
    };
  });
}

function buildLinkedItemPreviewSummary(linkedItem = {}, stateMaps, {selected = false, viewerParticipantId = ''} = {}) {
  const listingId = toIdString(linkedItem.listingId);
  const liveListing = stateMaps.liveListingsById.get(listingId) || null;
  const reservedOffer = stateMaps.reservedOffersByListingId.get(listingId) || null;
  const lastKnownStatus = liveListing?.status || linkedItem.lastKnownStatus || 'deleted';

  return {
    listingId,
    title: liveListing?.itemName || linkedItem.title || '',
    lastContextAt: linkedItem.lastContextAt || null,
    lastKnownStatus,
    state: deriveLinkedItemState({
      listing: liveListing,
      reservedOffer,
      conversationId: stateMaps.conversationId,
    }),
    relationshipRole: deriveLinkedItemRelationshipRole({
      listing: liveListing,
      reservedOffer,
      viewerParticipantId,
    }),
    isSelected: selected,
  };
}

function buildLinkedItemApiSummary(linkedItem = {}, stateMaps, {selected = false, viewerParticipantId = ''} = {}) {
  const listingId = toIdString(linkedItem.listingId);
  const liveListing = stateMaps.liveListingsById.get(listingId) || null;
  const reservedOffer = stateMaps.reservedOffersByListingId.get(listingId) || null;
  const threadOffer = stateMaps.threadOffersByListingId.get(listingId) || null;
  const lastKnownStatus = liveListing?.status || linkedItem.lastKnownStatus || 'deleted';

  return {
    listingId,
    title: liveListing?.itemName || linkedItem.title || '',
    imageUrl: liveListing?.itemPicture || linkedItem.imageUrl || '',
    firstLinkedAt: linkedItem.firstLinkedAt || null,
    lastContextAt: linkedItem.lastContextAt || null,
    firstContextMessageId: linkedItem.firstContextMessageId || null,
    latestContextMessageId: linkedItem.latestContextMessageId || null,
    lastKnownStatus,
    state: deriveLinkedItemState({
      listing: liveListing,
      reservedOffer,
      conversationId: stateMaps.conversationId,
    }),
    relationshipRole: deriveLinkedItemRelationshipRole({
      listing: liveListing,
      reservedOffer,
      viewerParticipantId,
    }),
    currentOffer: buildLinkedItemCurrentOfferSummary(threadOffer),
    isSelected: selected,
  };
}

function buildMessageAttachedItemSummary(
  message,
  stateMaps,
  linkedItemsById = new Map(),
  {viewerParticipantId = ''} = {}
) {
  const listingId = toIdString(message?.attachedListingId);

  if (!listingId) {
    return null;
  }

  const linkedItem = linkedItemsById.get(listingId) || {};
  const liveListing = stateMaps.liveListingsById.get(listingId) || null;
  const reservedOffer = stateMaps.reservedOffersByListingId.get(listingId) || null;

  return {
    listingId,
    title: liveListing?.itemName || message?.attachedListingTitle || linkedItem.title || '',
    imageUrl: liveListing?.itemPicture || message?.attachedListingImageUrl || linkedItem.imageUrl || '',
    lastKnownStatus: liveListing?.status || linkedItem.lastKnownStatus || 'deleted',
    state: deriveLinkedItemState({
      listing: liveListing,
      reservedOffer,
      conversationId: stateMaps.conversationId,
    }),
    relationshipRole: deriveLinkedItemRelationshipRole({
      listing: liveListing,
      reservedOffer,
      viewerParticipantId,
    }),
  };
}

async function serializeConversation(conversation, extras = {}) {
  if (!conversation) {
    return conversation;
  }

  const {viewerParticipantId = '', ...serializedExtras} = extras;
  const conversationObject = conversation.toObject({flattenMaps: true});
  const linkedItems = Array.isArray(conversationObject.linkedItems) ? conversationObject.linkedItems : [];
  const stateMaps = await buildLinkedItemStateMaps(linkedItems, conversationObject._id);
  const linkedItemSummaries = linkedItems
    .map((linkedItem) =>
      buildLinkedItemApiSummary(linkedItem, stateMaps, {
        selected: toIdString(linkedItem.listingId) === toIdString(conversationObject.activeListingId),
        viewerParticipantId,
      })
    )
    .sort((firstItem, secondItem) => {
      const firstTimestamp = normalizeDateValue(firstItem.lastContextAt)?.getTime() || 0;
      const secondTimestamp = normalizeDateValue(secondItem.lastContextAt)?.getTime() || 0;
      return secondTimestamp - firstTimestamp;
    });
  const activeItem =
    linkedItemSummaries.find(
      (linkedItem) => linkedItem.listingId === toIdString(conversationObject.activeListingId)
    ) || null;

  return {
    ...conversationObject,
    linkedItems: linkedItemSummaries,
    linkedItemCount: linkedItemSummaries.length,
    activeItem,
    ...serializedExtras,
  };
}

async function serializeConversationPreviews(conversations = [], {viewerParticipantId = ''} = {}) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return [];
  }

  const conversationObjects = conversations.map((conversation) =>
    conversation?.toObject ? conversation.toObject({flattenMaps: true}) : conversation
  );
  const previewLinkedItemsByConversationId = new Map(
    conversationObjects.map((conversationObject) => [
      toIdString(conversationObject._id),
      buildConversationPreviewLinkedItemSeeds(conversationObject),
    ])
  );
  const listingIds = dedupeIdStrings(
    conversationObjects.flatMap((conversationObject) =>
      (previewLinkedItemsByConversationId.get(toIdString(conversationObject._id)) || []).map(
        (linkedItem) => linkedItem.listingId
      )
    )
  );
  const liveListingsById = await fetchListingsByIds(listingIds, {
    select: 'itemName status userPublishingID reservedOfferId',
    lean: true,
  });
  const reservedOfferIds = dedupeIdStrings(
    listingIds.map((listingId) => liveListingsById.get(listingId)?.reservedOfferId).filter(Boolean)
  )
    .map((offerId) => toObjectId(offerId))
    .filter(Boolean);
  const reservedOffers = reservedOfferIds.length > 0
    ? await Offer.find({
      _id: {$in: reservedOfferIds},
    })
      .select('conversationId sellerClerkUserId')
      .lean()
    : [];
  const reservedOffersById = new Map(
    reservedOffers.map((offer) => [toIdString(offer?._id || offer?.id), offer])
  );
  const reservedOffersByListingId = new Map();

  listingIds.forEach((listingId) => {
    const listing = liveListingsById.get(listingId);
    const reservedOffer = listing?.reservedOfferId
      ? reservedOffersById.get(toIdString(listing.reservedOfferId)) || null
      : null;

    reservedOffersByListingId.set(listingId, reservedOffer);
  });

  return conversationObjects.map((conversationObject) => {
    const linkedItems =
      previewLinkedItemsByConversationId.get(toIdString(conversationObject._id)) || [];
    const stateMaps = {
      liveListingsById,
      reservedOffersByListingId,
      conversationId: toIdString(conversationObject._id),
    };
    const linkedItemSummaries = linkedItems
      .map((linkedItem) =>
        buildLinkedItemPreviewSummary(linkedItem, stateMaps, {
          selected: toIdString(linkedItem.listingId) === toIdString(conversationObject.activeListingId),
          viewerParticipantId,
        })
      )
      .sort((firstItem, secondItem) => {
        const firstTimestamp = normalizeDateValue(firstItem.lastContextAt)?.getTime() || 0;
        const secondTimestamp = normalizeDateValue(secondItem.lastContextAt)?.getTime() || 0;
        return secondTimestamp - firstTimestamp;
      });
    const activeItem =
      linkedItemSummaries.find(
        (linkedItem) => linkedItem.listingId === toIdString(conversationObject.activeListingId)
      ) || null;

    return {
      ...conversationObject,
      linkedItems: linkedItemSummaries,
      linkedItemCount: linkedItemSummaries.length,
      activeItem,
      itemPreviewTitles: linkedItemSummaries.map((linkedItem) => linkedItem.title).filter(Boolean),
    };
  });
}

async function serializeMessages(messages = [], conversation, options = {}) {
  const linkedItems = Array.isArray(conversation?.linkedItems)
    ? conversation.linkedItems.map((linkedItem) => (linkedItem?.toObject ? linkedItem.toObject() : linkedItem))
    : [];
  const stateMaps = await buildLinkedItemStateMaps(linkedItems, conversation?._id);
  const linkedItemsById = new Map(
    linkedItems.map((linkedItem) => [toIdString(linkedItem.listingId), linkedItem])
  );
  const offerParticipantIds = dedupeIdStrings(
    messages.flatMap((message) => ([
      message?.offerSnapshot?.buyerClerkUserId,
      message?.offerSnapshot?.sellerClerkUserId,
    ])).filter(Boolean)
  );
  const participantProfiles = offerParticipantIds.length > 0
    ? await Profile.find({
      profileID: {$in: offerParticipantIds},
    })
    : [];
  const participantNamesById = new Map(
    participantProfiles.map((profile) => [profile.profileID, profile.profileName])
  );

  return messages.map((message) => {
    const messageObject = message?.toObject ? message.toObject() : message;

    return {
      ...messageObject,
      attachedItem: buildMessageAttachedItemSummary(messageObject, stateMaps, linkedItemsById, options),
      offerContext: buildOfferApiSummary(messageObject.offerSnapshot, {
        includeEventTitle: true,
        viewerParticipantId: options.viewerParticipantId,
        participantNamesById,
      }),
    };
  });
}

function buildProfileUpdatePayload(payload = {}, {allowEmptyStrings = false} = {}) {
  const nextProfile = {};

  if (typeof payload.profileName === 'string') {
    const profileName = payload.profileName.trim();
    if (profileName) {
      nextProfile.profileName = profileName;
    }
  }

  const stringFields = [
    'profilePicture',
    'profileBanner',
    'profileBio',
    'instagramUrl',
    'linkedinUrl',
  ];

  stringFields.forEach((field) => {
    if (typeof payload[field] !== 'string') {
      return;
    }

    const normalizedValue = payload[field].trim();

    if (normalizedValue || allowEmptyStrings) {
      nextProfile[field] = normalizedValue;
    }
  });

  if (typeof payload.profileRating !== 'undefined' && Number.isFinite(Number(payload.profileRating))) {
    nextProfile.profileRating = Number(payload.profileRating);
  }

  if (typeof payload.ufVerified === 'boolean') {
    nextProfile.ufVerified = payload.ufVerified;
  }

  if (payload.trustMetrics && typeof payload.trustMetrics === 'object') {
    const trustMetrics = {};

    ['reliability', 'accuracy', 'responsiveness', 'safety'].forEach((metric) => {
      const metricValue = payload.trustMetrics[metric];

      if (metricValue === null) {
        trustMetrics[metric] = null;
        return;
      }

      if (Number.isFinite(Number(metricValue))) {
        trustMetrics[metric] = Number(metricValue);
      }
    });

    if (Object.keys(trustMetrics).length > 0) {
      nextProfile.trustMetrics = trustMetrics;
    }
  }

  return nextProfile;
}

const LOOPBACK_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

async function findOrCreateConversation({participantIds, activeListingId = null}) {
  const normalizedParticipantIds = normalizeParticipantIds(participantIds);
  const normalizedListingId = toObjectId(activeListingId);

  if (normalizedParticipantIds.length !== 2) {
    throw new Error('Exactly two unique participantIds are required');
  }

  let conversation = await findConversationByParticipantIds(normalizedParticipantIds);

  if (conversation) {
    if (
      normalizedListingId &&
      !conversation.linkedListingIds.some((listingId) => listingId.toString() === normalizedListingId.toString())
    ) {
      conversation.linkedListingIds.push(normalizedListingId);
    }

    if (normalizedListingId) {
      conversation.activeListingId = normalizedListingId;
    }

    if (normalizedListingId) {
      await repairConversationLinkedItems(conversation, {
        touchedListingId: normalizedListingId,
        contextAt: new Date(),
      });
    }

    await conversation.save();
    return conversation;
  }

  conversation = await Conversation.create({
    participantIds: normalizedParticipantIds,
    linkedListingIds: normalizedListingId ? [normalizedListingId] : [],
    activeListingId: normalizedListingId,
  });

  if (normalizedListingId) {
    await repairConversationLinkedItems(conversation, {
      touchedListingId: normalizedListingId,
      contextAt: conversation.createdAt || new Date(),
    });
    await conversation.save();
  }

  return conversation;
}

function isAllowedDevOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const {hostname} = new URL(origin);
    return LOOPBACK_DEV_HOSTS.has(hostname);
  } catch (error) {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json({limit: '10mb'}));

app.use((err, req, res, next) => {
  if (err.code === 'entity.too.large' || err.type === 'entity.too.large') {
    res.status(413).json({
      message: 'File too large. Choose a smaller image and try again.',
    });
    return;
  }

  next(err);
});

app.get('/', (req, resp) => {
  resp.send('App is working');
});

app.get('/api/conversations', async (req, resp) => {
  try {
    const participantId = req.query.participantId?.trim();
    const requestedPage = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 5));

    if (!participantId) {
      return resp.status(400).json({message: 'participantId is required'});
    }

    const conversationQuery = {
      participantIds: participantId,
    };
    const totalCount = await Conversation.countDocuments(conversationQuery);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const conversations = await Conversation.find(conversationQuery)
      .select(
        'participantIds linkedListingIds activeListingId lastMessageText lastMessageAt lastReadAtByUser ' +
        'linkedItems.listingId linkedItems.title linkedItems.lastContextAt linkedItems.lastKnownStatus'
      )
      .sort({lastMessageAt: -1, updatedAt: -1})
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const serializedConversations = await serializeConversationPreviews(conversations, {
      viewerParticipantId: participantId,
    });

    const otherParticipantIds = dedupeIdStrings(
      serializedConversations.map((conversation) =>
        conversation.participantIds.find((currentParticipantId) => currentParticipantId !== participantId)
      )
    );
    const participantProfiles = otherParticipantIds.length > 0
      ? await Profile.find({
        profileID: {$in: otherParticipantIds},
      }).select('profileID profileName profilePicture').lean()
      : [];
    const participantProfilesById = new Map(
      participantProfiles.map((profile) => [profile.profileID, profile])
    );
    const latestMessages = conversations.length > 0
      ? await Message.aggregate([
        {
          $match: {
            conversationId: {$in: conversations.map((conversation) => conversation._id)},
          },
        },
        {
          $sort: {
            createdAt: -1,
            _id: -1,
          },
        },
        {
          $group: {
            _id: '$conversationId',
            senderClerkUserId: {$first: '$senderClerkUserId'},
          },
        },
      ])
      : [];
    const latestMessageSenderByConversationId = new Map(
      latestMessages.map((message) => [toIdString(message._id), message.senderClerkUserId || ''])
    );

    resp.json({
      conversations: serializedConversations.map((conversation) => {
        const otherParticipantId = conversation.participantIds.find(
          (currentParticipantId) => currentParticipantId !== participantId
        ) || '';
        const otherParticipantProfile = participantProfilesById.get(otherParticipantId) || null;

        return {
          ...conversation,
          otherParticipantId,
          otherParticipant: otherParticipantProfile ? {
            id: otherParticipantProfile.profileID,
            name: otherParticipantProfile.profileName,
            avatarUrl: otherParticipantProfile.profilePicture || '',
          } : null,
          lastMessageSenderClerkUserId:
            latestMessageSenderByConversationId.get(toIdString(conversation._id)) || '',
        };
      }),
      page,
      pageSize,
      totalCount,
      totalPages,
    });
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch conversations', error: e.message});
  }
});

app.post('/api/conversations', async (req, resp) => {
  try {
    const {participantIds, activeListingId} = req.body;
    const normalizedParticipantIds = normalizeParticipantIds(participantIds);

    if (normalizedParticipantIds.length !== 2) {
      return resp.status(400).json({
        message: 'Exactly two unique participantIds are required',
      });
    }

    const existingConversation = await findConversationByParticipantIds(normalizedParticipantIds);
    const conversation = await findOrCreateConversation({
      participantIds,
      activeListingId,
    });

    resp.status(existingConversation ? 200 : 201).json(conversation);
  } catch (e) {
    resp.status(500).json({message: 'Failed to create conversation', error: e.message});
  }
});

app.get('/api/conversations/:id/messages', async (req, resp) => {
  try {
    const conversationId = toObjectId(req.params.id);
    const participantId = req.query.participantId?.trim();

    if (!conversationId) {
      return resp.status(400).json({message: 'Valid conversation id is required'});
    }

    if (!participantId) {
      return resp.status(400).json({message: 'participantId is required'});
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return resp.status(404).json({message: 'Conversation not found'});
    }

    if (!conversation.participantIds.includes(participantId)) {
      return resp.status(403).json({message: 'You are not a participant in this conversation'});
    }

    await repairConversationPickupHub(conversation);
    const {changed} = await repairConversationLinkedItems(conversation);
    const {reservedOffer} = await getReservedOfferForConversation(conversation);
    conversation.lastReadAtByUser.set(participantId, new Date());
    await conversation.save();

    const messages = await Message.find({conversationId}).sort({createdAt: 1});

    resp.json({
      conversation: await serializeConversation(conversation, {
        isMeetupHubLocked: Boolean(reservedOffer),
        viewerParticipantId: participantId,
      }),
      messages: await serializeMessages(messages, conversation, {
        viewerParticipantId: participantId,
      }),
    });
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch messages', error: e.message});
  }
});

app.post('/api/conversations/:id/messages', async (req, resp) => {
  try {
    const conversationId = toObjectId(req.params.id);
    const {senderClerkUserId, body, attachedListingId} = req.body;
    const trimmedSenderId = senderClerkUserId?.trim();
    const trimmedBody = body?.trim();

    if (!conversationId) {
      return resp.status(400).json({message: 'Valid conversation id is required'});
    }

    if (!trimmedSenderId) {
      return resp.status(400).json({message: 'senderClerkUserId is required'});
    }

    if (!trimmedBody) {
      return resp.status(400).json({message: 'Message body is required'});
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return resp.status(404).json({message: 'Conversation not found'});
    }

    if (!conversation.participantIds.includes(trimmedSenderId)) {
      return resp.status(403).json({message: 'You are not a participant in this conversation'});
    }

    const attachedListingFields = await buildAttachedListingMessageFields(attachedListingId);
    const message = await Message.create({
      conversationId,
      senderClerkUserId: trimmedSenderId,
      body: trimmedBody,
      attachedListingId: attachedListingFields.attachedListingId,
      attachedListingTitle: attachedListingFields.attachedListingTitle,
      attachedListingImageUrl: attachedListingFields.attachedListingImageUrl,
    });

    conversation.lastMessageText = trimmedBody;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastReadAtByUser.set(trimmedSenderId, message.createdAt);

    await repairConversationLinkedItems(conversation, {
      touchedListingId: message.attachedListingId,
      contextAt: message.createdAt,
      contextMessageId: message._id,
      fallbackTitle: message.attachedListingTitle,
      fallbackImageUrl: message.attachedListingImageUrl,
    });

    if (message.attachedListingId) {
      conversation.activeListingId = message.attachedListingId;
    }

    await conversation.save();
    const [serializedMessage] = await serializeMessages([message], conversation, {
      viewerParticipantId: trimmedSenderId,
    });

    resp.status(201).json(serializedMessage);
  } catch (e) {
    resp.status(500).json({message: 'Failed to send message', error: e.message});
  }
});

app.patch('/api/conversations/:id/pickup', async (req, resp) => {
  try {
    const conversationId = toObjectId(req.params.id);
    const requesterClerkUserId = req.body.requesterClerkUserId?.trim();
    const pickupHubId = req.body.pickupHubId?.trim() || '';
    const pickupSpecifics = normalizePickupSpecifics(req.body.pickupSpecifics);

    if (!conversationId) {
      return resp.status(400).json({message: 'Valid conversation id is required'});
    }

    if (!requesterClerkUserId) {
      return resp.status(400).json({message: 'requesterClerkUserId is required'});
    }

    if (!pickupSpecifics) {
      return resp.status(400).json({message: 'pickupSpecifics is required'});
    }

    if (!isValidPickupSpecifics(pickupSpecifics)) {
      return resp.status(400).json({
        message: `pickupSpecifics must be at least ${MIN_PICKUP_SPECIFICS_LENGTH} characters`,
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return resp.status(404).json({message: 'Conversation not found'});
    }

    if (!conversation.participantIds.includes(requesterClerkUserId)) {
      return resp.status(403).json({message: 'You are not a participant in this conversation'});
    }

    const listing = await getConversationListing(conversation);

    if (!listing) {
      return resp.status(404).json({message: 'Listing not found for this conversation'});
    }

    if (listing.userPublishingID !== requesterClerkUserId) {
      return resp.status(403).json({message: 'Only the seller can update meetup details'});
    }

    const {reservedOffer} = await getReservedOfferForConversation(conversation);
    const resolvedReservedOfferPickup = deriveOfferPickupFields({
      meetupHubId: reservedOffer?.meetupHubId,
      meetupLocation: reservedOffer?.meetupLocation,
    });
    const lockedPickupHubId =
      conversation.activePickupHubId ||
      listing.pickupHubId ||
      resolvedReservedOfferPickup.meetupHubId ||
      null;
    const lockedPickupLabel =
      getPickupHubById(lockedPickupHubId)?.label ||
      listing.itemLocation ||
      resolvedReservedOfferPickup.meetupLocation ||
      '';

    if (!reservedOffer && !pickupHubId) {
      return resp.status(400).json({message: 'pickupHubId is required'});
    }

    if (!reservedOffer && pickupHubId && !getPickupHubById(pickupHubId)) {
      return resp.status(400).json({message: 'pickupHubId must be one of the approved pickup hubs'});
    }

    if (reservedOffer && lockedPickupHubId && pickupHubId && pickupHubId !== lockedPickupHubId) {
      return resp.status(409).json({
        message: 'The meetup hub is locked after acceptance. You can still update meetup specifics.',
      });
    }

    if (reservedOffer && !lockedPickupHubId && pickupHubId) {
      return resp.status(409).json({
        message: 'The meetup hub is locked after acceptance. You can still update meetup specifics.',
      });
    }

    const pickupHubLabel = getPickupHubById(pickupHubId)?.label || lockedPickupLabel;
    const systemMessageBody = `Meetup details updated to ${pickupHubLabel}. Specifics: ${pickupSpecifics}`;

    await syncReservedConversationListingPickup(conversation, pickupHubId);
    conversation.activePickupHubId = pickupHubId || null;
    conversation.activePickupSpecifics = pickupSpecifics;

    const attachedListingFields = await buildAttachedListingMessageFields(conversation.activeListingId || null);
    const systemMessage = await Message.create({
      conversationId,
      senderClerkUserId: 'system',
      body: systemMessageBody,
      attachedListingId: attachedListingFields.attachedListingId,
      attachedListingTitle: attachedListingFields.attachedListingTitle,
      attachedListingImageUrl: attachedListingFields.attachedListingImageUrl,
    });

    conversation.lastMessageText = systemMessage.body;
    conversation.lastMessageAt = systemMessage.createdAt;
    conversation.lastReadAtByUser.set(requesterClerkUserId, systemMessage.createdAt);
    await repairConversationLinkedItems(conversation, {
      touchedListingId: systemMessage.attachedListingId,
      contextAt: systemMessage.createdAt,
      contextMessageId: systemMessage._id,
      fallbackTitle: systemMessage.attachedListingTitle,
      fallbackImageUrl: systemMessage.attachedListingImageUrl,
    });

    await conversation.save();
    const [serializedSystemMessage] = await serializeMessages([systemMessage], conversation, {
      viewerParticipantId: requesterClerkUserId,
    });

    resp.json({
      conversation: await serializeConversation(conversation, {
        isMeetupHubLocked: Boolean(reservedOffer),
        viewerParticipantId: requesterClerkUserId,
      }),
      systemMessage: serializedSystemMessage,
    });
  } catch (e) {
    resp.status(500).json({message: 'Failed to update pickup details', error: e.message});
  }
});

app.post('/api/listings/:id/offers', async (req, resp) => {
  try {
    const listingId = toObjectId(req.params.id);
    const {
      buyerClerkUserId,
      buyerDisplayName,
      offeredPrice,
      meetupHubId,
      meetupLocation,
      meetupWindow,
      paymentMethod,
      message,
    } = req.body;
    const trimmedBuyerId = buyerClerkUserId?.trim();
    const trimmedBuyerDisplayName = buyerDisplayName?.trim() || 'Buyer';
    const trimmedMeetupLocation = meetupLocation?.trim();
    const trimmedMeetupWindow = meetupWindow?.trim();
    const normalizedMessage = message?.trim() || '';
    const normalizedPrice = Number(offeredPrice);

    if (!listingId) {
      return resp.status(400).json({message: 'Valid listing id is required'});
    }

    if (!trimmedBuyerId) {
      return resp.status(400).json({message: 'buyerClerkUserId is required'});
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return resp.status(400).json({message: 'A valid offeredPrice is required'});
    }

    const resolvedMeetupFields = deriveOfferPickupFields({
      meetupHubId,
      meetupLocation: trimmedMeetupLocation,
    });

    if (!resolvedMeetupFields.meetupLocation) {
      return resp.status(400).json({message: 'meetupLocation is required'});
    }

    if (!trimmedMeetupWindow) {
      return resp.status(400).json({message: 'meetupWindow is required'});
    }

    if (!['cash', 'externalApp', 'gatorgoodsEscrow'].includes(paymentMethod)) {
      return resp.status(400).json({message: 'Valid paymentMethod is required'});
    }

    const listing = await Item.findById(listingId);

    if (!listing) {
      return resp.status(404).json({message: 'Listing not found'});
    }

    if (listing.userPublishingID === trimmedBuyerId) {
      return resp.status(400).json({message: 'You cannot submit an offer on your own listing'});
    }

    if (listing.status !== 'active') {
      return resp.status(409).json({message: 'This listing is no longer accepting offers'});
    }

    const conversation = await findOrCreateConversation({
      participantIds: [trimmedBuyerId, listing.userPublishingID],
      activeListingId: listing.id,
    });

    const offer = await Offer.create({
      listingId,
      buyerClerkUserId: trimmedBuyerId,
      buyerDisplayName: trimmedBuyerDisplayName,
      sellerClerkUserId: listing.userPublishingID,
      conversationId: conversation.id,
      offeredPrice: normalizedPrice,
      meetupHubId: resolvedMeetupFields.meetupHubId,
      meetupArea: resolvedMeetupFields.meetupArea,
      meetupLocation: resolvedMeetupFields.meetupLocation,
      meetupWindow: trimmedMeetupWindow,
      paymentMethod,
      message: normalizedMessage,
    });

    const systemMessage = await createOfferSystemMessage({
      conversationId: conversation._id,
      listingId,
      offer,
      eventType: 'sent',
    });
    conversation.lastMessageText = systemMessage.body;
    conversation.lastMessageAt = systemMessage.createdAt;
    conversation.lastReadAtByUser.set(trimmedBuyerId, systemMessage.createdAt);
    await repairConversationLinkedItems(conversation, {
      touchedListingId: listingId,
      contextAt: systemMessage.createdAt,
      contextMessageId: systemMessage._id,
      fallbackTitle: systemMessage.attachedListingTitle,
      fallbackImageUrl: systemMessage.attachedListingImageUrl,
      fallbackStatus: listing.status,
    });
    await conversation.save();

    resp.status(201).json(offer);
  } catch (e) {
    resp.status(500).json({message: 'Failed to create offer', error: e.message});
  }
});

app.get('/api/offers', async (req, resp) => {
  try {
    const participantId = req.query.participantId?.trim();
    const role = req.query.role?.trim();

    if (!participantId) {
      return resp.status(400).json({message: 'participantId is required'});
    }

    if (!['buyer', 'seller'].includes(role)) {
      return resp.status(400).json({message: 'role must be buyer or seller'});
    }

    const query =
      role === 'buyer'
        ? {buyerClerkUserId: participantId}
        : {sellerClerkUserId: participantId};

    const offers = await Offer.find(query).sort({createdAt: -1, _id: -1});

    resp.json(offers);
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch offers', error: e.message});
  }
});

app.get('/api/offers/:id', async (req, resp) => {
  try {
    const offerId = toObjectId(req.params.id);

    if (!offerId) {
      return resp.status(400).json({ message: 'Valid offer id is required' });
    }

    const offer = await Offer.findById(offerId);

    if (!offer) {
      return resp.status(404).json({ message: 'Offer not found' });
    }

    resp.json(offer);
  } catch (e) {
    resp.status(500).json({ message: 'Failed to fetch offer', error: e.message });
  }
});

app.patch('/api/offers/:id', async (req, resp) => {
  try {
    const offerId = toObjectId(req.params.id);
    const requesterClerkUserId = req.body.requesterClerkUserId?.trim();
    const nextStatus = req.body.status?.trim();
    const pickupSpecifics = normalizePickupSpecifics(req.body.pickupSpecifics);

    if (!offerId) {
      return resp.status(400).json({message: 'Valid offer id is required'});
    }

    if (!requesterClerkUserId) {
      return resp.status(400).json({message: 'requesterClerkUserId is required'});
    }

    if (!['accepted', 'declined'].includes(nextStatus)) {
      return resp.status(400).json({message: 'status must be accepted or declined'});
    }

    const offer = await Offer.findById(offerId);

    if (!offer) {
      return resp.status(404).json({message: 'Offer not found'});
    }

    if (offer.sellerClerkUserId !== requesterClerkUserId) {
      return resp.status(403).json({message: 'Only the seller can update this offer'});
    }

    if (offer.status !== 'pending') {
      return resp.status(409).json({message: 'Only pending offers can be updated'});
    }

    const listing = await Item.findById(offer.listingId);

    if (!listing) {
      return resp.status(404).json({message: 'Listing not found'});
    }

    if (nextStatus === 'accepted') {
      if (!pickupSpecifics) {
        return resp.status(400).json({message: 'pickupSpecifics is required when accepting an offer'});
      }

      if (!isValidPickupSpecifics(pickupSpecifics)) {
        return resp.status(400).json({
          message: `pickupSpecifics must be at least ${MIN_PICKUP_SPECIFICS_LENGTH} characters`,
        });
      }

      const reservedByDifferentOffer =
        listing.status === 'reserved' &&
        listing.reservedOfferId &&
        listing.reservedOfferId.toString() !== offer.id;

      if (listing.status === 'sold' || listing.status === 'archived' || reservedByDifferentOffer) {
        return resp.status(409).json({message: 'This listing can no longer accept this offer'});
      }

      offer.status = 'accepted';
      listing.status = 'reserved';
      listing.reservedOfferId = offer._id;
      const resolvedAcceptedPickup = deriveOfferPickupFields({
        meetupHubId: offer.meetupHubId,
        meetupLocation: offer.meetupLocation,
      });
      const conversation =
        (offer.conversationId ? await Conversation.findById(offer.conversationId) : null) ||
        (await findConversationByParticipantIds([offer.buyerClerkUserId, offer.sellerClerkUserId]));
      let systemMessage = null;

      if (conversation) {
        conversation.activeListingId = offer.listingId;
        ensureListingOriginalPickupFields(listing);
        applyCurrentListingPickupFields(
          listing,
          deriveListingPickupFields({
            pickupHubId: resolvedAcceptedPickup.meetupHubId,
            itemLocation: resolvedAcceptedPickup.meetupLocation,
          })
        );
        conversation.activePickupHubId = resolvedAcceptedPickup.meetupHubId || null;
        conversation.activePickupSpecifics = pickupSpecifics;

        const pickupHubLabel =
          getPickupHubById(resolvedAcceptedPickup.meetupHubId)?.label || resolvedAcceptedPickup.meetupLocation;
        systemMessage = await createOfferSystemMessage({
          conversationId: conversation._id,
          listingId: offer.listingId,
          offer: {
            ...offer.toObject(),
            meetupHubId: resolvedAcceptedPickup.meetupHubId || offer.meetupHubId,
            meetupLocation: pickupHubLabel,
          },
          eventType: 'accepted',
        });

        conversation.lastMessageText = systemMessage.body;
        conversation.lastMessageAt = systemMessage.createdAt;
        conversation.lastReadAtByUser.set(requesterClerkUserId, systemMessage.createdAt);
        await repairConversationLinkedItems(conversation, {
          touchedListingId: offer.listingId,
          contextAt: systemMessage.createdAt,
          contextMessageId: systemMessage._id,
          fallbackTitle: systemMessage.attachedListingTitle,
          fallbackImageUrl: systemMessage.attachedListingImageUrl,
          fallbackStatus: listing.status,
        });
      }

      const saveOperations = [
        offer.save(),
        listing.save(),
      ];

      if (conversation) {
        saveOperations.push(conversation.save());
      }

      await Promise.all([
        ...saveOperations,
      ]);

      const competingOffers = await Offer.find({
        listingId: offer.listingId,
        _id: {$ne: offer._id},
        status: 'pending',
      });

      await Promise.all(
        competingOffers.map(async (competingOffer) => {
          competingOffer.status = 'declined';
          await competingOffer.save();

          const competingConversation =
            (competingOffer.conversationId ? await Conversation.findById(competingOffer.conversationId) : null) ||
            (await findConversationByParticipantIds([competingOffer.buyerClerkUserId, competingOffer.sellerClerkUserId]));

          if (!competingConversation) {
            return;
          }

          const declineMessage = await createOfferSystemMessage({
            conversationId: competingConversation._id,
            listingId: competingOffer.listingId,
            offer: competingOffer,
            eventType: 'declined',
          });

          competingConversation.lastMessageText = declineMessage.body;
          competingConversation.lastMessageAt = declineMessage.createdAt;
          competingConversation.lastReadAtByUser.set(requesterClerkUserId, declineMessage.createdAt);
          await repairConversationLinkedItems(competingConversation, {
            touchedListingId: competingOffer.listingId,
            contextAt: declineMessage.createdAt,
            contextMessageId: declineMessage._id,
            fallbackTitle: declineMessage.attachedListingTitle,
            fallbackImageUrl: declineMessage.attachedListingImageUrl,
            fallbackStatus: listing.status,
          });
          await competingConversation.save();
        })
      );

      return resp.json(offer);
    }

    offer.status = 'declined';
    await offer.save();

    const conversation =
      (offer.conversationId ? await Conversation.findById(offer.conversationId) : null) ||
      (await findConversationByParticipantIds([offer.buyerClerkUserId, offer.sellerClerkUserId]));

    if (conversation) {
      const declineMessage = await createOfferSystemMessage({
        conversationId: conversation._id,
        listingId: offer.listingId,
        offer,
        eventType: 'declined',
      });

      conversation.lastMessageText = declineMessage.body;
      conversation.lastMessageAt = declineMessage.createdAt;
      conversation.lastReadAtByUser.set(requesterClerkUserId, declineMessage.createdAt);
      await repairConversationLinkedItems(conversation, {
        touchedListingId: offer.listingId,
        contextAt: declineMessage.createdAt,
        contextMessageId: declineMessage._id,
        fallbackTitle: declineMessage.attachedListingTitle,
        fallbackImageUrl: declineMessage.attachedListingImageUrl,
        fallbackStatus: listing.status,
      });
      await conversation.save();
    }

    resp.json(offer);
  } catch (e) {
    resp.status(500).json({message: 'Failed to update offer', error: e.message});
  }
});

// Create an item to put into listing
app.post('/create-item', async (req, resp) => {
  try {
    const {
      itemName,
      itemCost,
      itemCondition,
      pickupHubId,
      itemLocation,
      itemPicture,
      itemDescription,
      itemDetails,
      userPublishingID,
      userPublishingName,
      itemCat,
    } = req.body;

    const resolvedPickupFields = deriveListingPickupFields({
      pickupHubId,
      itemLocation,
    });

    if (!resolvedPickupFields.itemLocation) {
      return resp.status(400).json({message: 'itemLocation is required'});
    }

    const result = await Item.create({
      itemName,
      itemCost,
      itemCondition,
      itemLocation: resolvedPickupFields.itemLocation,
      pickupHubId: resolvedPickupFields.pickupHubId,
      pickupArea: resolvedPickupFields.pickupArea,
      originalItemLocation: resolvedPickupFields.itemLocation,
      originalPickupHubId: resolvedPickupFields.pickupHubId,
      originalPickupArea: resolvedPickupFields.pickupArea,
      itemPicture,
      itemDescription,
      itemDetails,
      userPublishingID,
      userPublishingName,
      itemCat,
    });

    resp.status(201).json(result);
  } catch (e) {
    resp
      .status(500)
      .send({message: 'Something went wrong', error: e.message});
  }
});

// Get entire listing
app.get('/items', async (req, resp) => {
  try {
    const hasQueryMode = ['page', 'limit', 'search', 'category', 'pickupLocation', 'sort'].some(
      (key) => typeof req.query[key] !== 'undefined'
    );

    if (!hasQueryMode) {
      const items = await Item.find();
      resp.json(items);
      return;
    }

    const page = clampPositiveInteger(req.query.page, 1);
    const limit = clampPositiveInteger(req.query.limit, 9, 24);
    const search = req.query.search?.trim() || '';
    const category = req.query.category?.trim() || '';
    const pickupLocation = req.query.pickupLocation?.trim() || '';
    const sort = req.query.sort?.trim() || 'newest';
    const filterClauses = [];

    if (category && category !== 'All') {
      filterClauses.push({itemCat: category});
    }

    if (pickupLocation && pickupLocation !== 'All') {
      if (!isApprovedPickupLocationLabel(pickupLocation)) {
        return resp.status(400).json({message: 'pickupLocation must match an approved pickup hub'});
      }

      const pickupHub = findPickupHubByLabel(pickupLocation);
      filterClauses.push({
        $or: [
          {originalPickupHubId: pickupHub?.id || null},
          {originalItemLocation: pickupHub?.label || pickupLocation},
          {
            originalPickupHubId: {$in: [null, '']},
            pickupHubId: pickupHub?.id || null,
          },
          {
            originalItemLocation: {$in: [null, '']},
            itemLocation: pickupHub?.label || pickupLocation,
          },
        ],
      });
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      filterClauses.push({
        $or: [
        {itemName: {$regex: escapedSearch, $options: 'i'}},
        {originalItemLocation: {$regex: escapedSearch, $options: 'i'}},
        {originalPickupArea: {$regex: escapedSearch, $options: 'i'}},
        {
          originalItemLocation: {$in: [null, '']},
          itemLocation: {$regex: escapedSearch, $options: 'i'},
        },
        {
          originalPickupArea: {$in: [null, '']},
          pickupArea: {$regex: escapedSearch, $options: 'i'},
        },
        {userPublishingName: {$regex: escapedSearch, $options: 'i'}},
        {itemCat: {$regex: escapedSearch, $options: 'i'}},
        ],
      });
    }

    const filter =
      filterClauses.length === 0 ? {} : filterClauses.length === 1 ? filterClauses[0] : {$and: filterClauses};

    const totalItems = await Item.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const safeSkip = (safePage - 1) * limit;
    const sortStage = getItemsSort(sort);
    const items =
      sort === 'price-low' || sort === 'price-high'
        ? await Item.aggregate([
          {$match: filter},
          {
            $addFields: {
              itemCostNumeric: {
                $convert: {
                  input: '$itemCost',
                  to: 'double',
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
          {$sort: sortStage},
          {$skip: safeSkip},
          {$limit: limit},
          {
            $project: {
              itemName: 1,
              itemCost: 1,
              itemCondition: 1,
              itemLocation: 1,
              pickupHubId: 1,
              originalPickupHubId: 1,
              pickupArea: 1,
              originalPickupArea: 1,
              originalItemLocation: 1,
              userPublishingName: 1,
              itemCat: 1,
              status: 1,
              date: 1,
            },
          },
        ])
        : await Item.find(filter)
          .select(ITEM_FEED_SELECT)
          .sort(sortStage)
          .skip(safeSkip)
          .limit(limit)
          .lean();

    resp.json({
      items: items.map((item) => buildItemFeedSummary(item)),
      meta: {
        page: safePage,
        limit,
        totalItems,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch', error: e.message});
  }
});

app.get('/items/:id/image', async (req, resp) => {
  try {
    const item = await Item.findById(req.params.id).select('itemPicture');

    if (!item || !item.itemPicture) {
      return resp.status(404).json({message: 'Listing image not found'});
    }

    if (/^https?:\/\//i.test(item.itemPicture)) {
      resp.redirect(item.itemPicture);
      return;
    }

    const parsedDataUrl = parseDataUrl(item.itemPicture);

    if (!parsedDataUrl) {
      return resp.status(404).json({message: 'Listing image not found'});
    }

    resp.set('Content-Type', parsedDataUrl.mimeType);
    resp.set('Cache-Control', 'public, max-age=31536000, immutable');
    resp.send(parsedDataUrl.data);
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch listing image', error: e.message});
  }
});

// Get listing info on an item
app.get('/items/:id', async (req, resp) => {
  try {
    const {id} = req.params;
    const item = await Item.findById(id);
    if (!item){
        return resp.status(404).json({message: 'Item not found'});
    }
    resp.status(200).json(item);    
  } catch (e) {
    resp.status(500).json({message: 'Failed to fetch', error: e.message});
  }
});

// Delete listing item
app.delete('/item/:item', async (req, resp) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.item);

    if (!deletedItem) {
      return resp.status(404).json({message: 'Not found'});
    }

    await Profile.updateMany(
      {profileFavorites: req.params.item},
      {$pull: {profileFavorites: req.params.item}}
    );

    resp.json({message: 'Listing deleted'});
  } catch (e) {
    resp.status(500).json({error: e.message});
  }
});

// Grabbing user profile information from DB
app.get('/profile/:profileID', async (req, resp) => {
    try{
        const profile = await Profile.findOne({profileID: req.params.profileID});
        if (!profile) {
            return resp.status(404).json({message: 'No Profile'});
        }
        const listings = await Item.find({userPublishingID: req.params.profileID,});
        resp.json({profile, listings});
    } catch (e) {
        resp.status(500).json({error: e.message});
    }
});

// For updating our DB with user profile information
app.post('/user', async (req, resp) => {
    try {
        const {profileID} = req.body;
        const profile = await Profile.findOneAndUpdate(
            {profileID},
            {
              $set: {
                profileID,
                ...buildProfileUpdatePayload(req.body),
              },
              $setOnInsert: {
                profileFavorites: [],
              },
            },
            {upsert: true, returnDocument: 'after', setDefaultsOnInsert: true}
        );
        resp.json(profile);
    } catch (e) {
        resp.status(500).json({error:e.message});
    }
});

app.patch('/user/:profileID', async (req, resp) => {
    try {
        const profileID = normalizeOptionalString(req.params.profileID);

        if (!profileID) {
            return resp.status(400).json({message: 'profileID is required'});
        }

        const nextProfile = buildProfileUpdatePayload(req.body, {allowEmptyStrings: true});

        if (Object.keys(nextProfile).length === 0) {
            return resp.status(400).json({message: 'No valid profile fields were provided'});
        }

        const profile = await Profile.findOneAndUpdate(
            {profileID},
            {$set: nextProfile},
            {returnDocument: 'after'}
        );

        if (!profile) {
            return resp.status(404).json({message: 'No Profile'});
        }

        resp.json(profile);
    } catch (e) {
        resp.status(500).json({error:e.message});
    }
});

// For updating a user's rep score
app.post('/update_score/:profileID', async (req,resp) => {
    try{
        const {reviewScore} = req.body;
        const profileID = req.params.profileID;
        const profile = await Profile.findOne({profileID: profileID});
        if (!profile) {
            return resp.status(404).json({message: 'No Profile'});
        }
        const newTotalReview = (profile.profileTotalRating) + 1;
        const newScore = ((profile.profileRating) * (profile.profileTotalRating) + reviewScore) / newTotalReview;
        profile.profileRating = newScore;
        profile.profileTotalRating = newTotalReview;
        await profile.save();
        resp.json(profile);
    } catch (e) {
        resp.status(500).json({error:e.message});
    }
});

// Adding favorite listings
app.post('/user/:uid/fav/:fid', async (req, resp) => {
  const {uid, fid} = req.params;
  try {
    const profile = await Profile.findOne({profileID: uid});
    if (!profile.profileFavorites.includes(fid)){
      profile.profileFavorites.push(fid);
      await profile.save();
    }
    resp.json({profileFavorites: profile.profileFavorites});
  } catch (e) {
    resp.status(500).json({error:e.message});
  }
});

// Deleting favorite listings
app.delete('/user/:uid/fav/:fid', async (req, resp) => {
  const {uid, fid} = req.params;
  try {
    const profile = await Profile.findOne({profileID: uid});
    profile.profileFavorites = profile.profileFavorites.filter(fav => fav.toString() !== fid);
    await profile.save();
    resp.json({profileFavorites: profile.profileFavorites});
  } catch (e) {
    resp.status(500).json({error:e.message});
  }
});

async function startServer(port = DEFAULT_PORT) {
  await connectToDatabase();

  return app.listen(port, () => {
    console.log(`App is running on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  clearDatabase,
  connectToDatabase,
  disconnectFromDatabase,
  models: {
    Conversation,
    Item,
    Message,
    Offer,
    Profile,
  },
  startServer,
};
