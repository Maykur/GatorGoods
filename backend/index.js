// REFERENCE: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const {
  deriveListingPickupFields,
  deriveOfferPickupFields,
  isApprovedPickupHubId,
  isApprovedPickupLocationLabel,
  findPickupHubByLabel,
} = require('../src/lib/pickupHubs');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;

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
  pickupArea: {
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

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
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

  let conversation = await Conversation.findOne({
    participantIds: normalizedParticipantIds,
    ...(normalizedListingId ? {linkedListingIds: normalizedListingId} : {}),
  });

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

    await conversation.save();
    return conversation;
  }

  conversation = await Conversation.create({
    participantIds: normalizedParticipantIds,
    linkedListingIds: normalizedListingId ? [normalizedListingId] : [],
    activeListingId: normalizedListingId,
  });

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

    if (!participantId) {
      return resp.status(400).json({message: 'participantId is required'});
    }

    const conversations = await Conversation.find({
      participantIds: participantId,
    }).sort({lastMessageAt: -1, updatedAt: -1});

    resp.json(conversations);
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

    const existingConversation = await Conversation.findOne({
      participantIds: normalizedParticipantIds,
      ...(activeListingId ? {linkedListingIds: activeListingId} : {}),
    });
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

    conversation.lastReadAtByUser.set(participantId, new Date());
    await conversation.save();

    const messages = await Message.find({conversationId}).sort({createdAt: 1});

    resp.json({
      conversation,
      messages,
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

    const message = await Message.create({
      conversationId,
      senderClerkUserId: trimmedSenderId,
      body: trimmedBody,
      attachedListingId: toObjectId(attachedListingId),
    });

    conversation.lastMessageText = trimmedBody;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastReadAtByUser.set(trimmedSenderId, message.createdAt);

    if (message.attachedListingId) {
      const alreadyLinked = conversation.linkedListingIds.some(
        (listingId) => listingId.toString() === message.attachedListingId.toString()
      );

      if (!alreadyLinked) {
        conversation.linkedListingIds.push(message.attachedListingId);
      }

      conversation.activeListingId = message.attachedListingId;
    }

    await conversation.save();

    resp.status(201).json(message);
  } catch (e) {
    resp.status(500).json({message: 'Failed to send message', error: e.message});
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

    if (typeof meetupHubId !== 'undefined' && meetupHubId !== null && !isApprovedPickupHubId(meetupHubId)) {
      return resp.status(400).json({message: 'meetupHubId must be one of the approved pickup hubs'});
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

app.patch('/api/offers/:id', async (req, resp) => {
  try {
    const offerId = toObjectId(req.params.id);
    const requesterClerkUserId = req.body.requesterClerkUserId?.trim();
    const nextStatus = req.body.status?.trim();

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

      await Promise.all([
        offer.save(),
        listing.save(),
        Offer.updateMany(
          {
            listingId: offer.listingId,
            _id: {$ne: offer._id},
            status: 'pending',
          },
          {
            $set: {
              status: 'declined',
            },
          }
        ),
      ]);

      return resp.json(offer);
    }

    offer.status = 'declined';
    await offer.save();

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

    if (typeof pickupHubId !== 'undefined' && pickupHubId !== null && !isApprovedPickupHubId(pickupHubId)) {
      return resp.status(400).json({message: 'pickupHubId must be one of the approved pickup hubs'});
    }

    const resolvedPickupFields = deriveListingPickupFields({
      pickupHubId,
      itemLocation,
    });

    const result = await Item.create({
      itemName,
      itemCost,
      itemCondition,
      itemLocation: resolvedPickupFields.itemLocation,
      pickupHubId: resolvedPickupFields.pickupHubId,
      pickupArea: resolvedPickupFields.pickupArea,
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
          {pickupHubId: pickupHub?.id || null},
          {itemLocation: pickupHub?.label || pickupLocation},
        ],
      });
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      filterClauses.push({
        $or: [
        {itemName: {$regex: escapedSearch, $options: 'i'}},
        {itemLocation: {$regex: escapedSearch, $options: 'i'}},
        {pickupArea: {$regex: escapedSearch, $options: 'i'}},
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

    const items = await Item.aggregate([
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
          itemCostNumeric: 0,
        },
      },
    ]);

    resp.json({
      items,
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
