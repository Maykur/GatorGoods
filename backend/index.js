// REFERENCE: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

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
  date: {
    type: Date,
    default: Date.now,
  },
});

const profileSchema = new mongoose.Schema({
  profileName: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
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
  date: {
    type: Date,
    default: Date.now,
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
  },
  {
    timestamps: true,
  }
);

messageSchema.index({conversationId: 1, createdAt: 1});

const Item = mongoose.models.items || mongoose.model('items', ItemSchema);
const Profile = mongoose.models.profiles || mongoose.model('profiles', profileSchema);
const Conversation = mongoose.models.conversations || mongoose.model('conversations', conversationSchema);
const Message = mongoose.models.messages || mongoose.model('messages', messageSchema);

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

const LOOPBACK_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

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
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
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

    let conversation = await Conversation.findOne({
      participantIds: normalizedParticipantIds,
      ...(activeListingId ? {linkedListingIds: activeListingId} : {}),
    });

    if (conversation) {
      if (activeListingId && !conversation.linkedListingIds.some((listingId) => listingId.toString() === activeListingId)) {
        conversation.linkedListingIds.push(activeListingId);
        conversation.activeListingId = activeListingId;
        await conversation.save();
      }

      return resp.json(conversation);
    }

    conversation = await Conversation.create({
      participantIds: normalizedParticipantIds,
      linkedListingIds: activeListingId ? [activeListingId] : [],
      activeListingId: activeListingId || null,
    });

    resp.status(201).json(conversation);
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

// Create an item to put into listing
app.post('/create-item', async (req, resp) => {
  try {
    const {
      itemName,
      itemCost,
      itemCondition,
      itemLocation,
      itemPicture,
      itemDescription,
      itemDetails,
      userPublishingID,
      userPublishingName,
      itemCat,
    } = req.body;

    const result = await Item.create({
      itemName,
      itemCost,
      itemCondition,
      itemLocation,
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
    const hasQueryMode = ['page', 'limit', 'search', 'category', 'sort'].some(
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
    const sort = req.query.sort?.trim() || 'newest';
    const filter = {};

    if (category && category !== 'All') {
      filter.itemCat = category;
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        {itemName: {$regex: escapedSearch, $options: 'i'}},
        {itemLocation: {$regex: escapedSearch, $options: 'i'}},
        {userPublishingName: {$regex: escapedSearch, $options: 'i'}},
        {itemCat: {$regex: escapedSearch, $options: 'i'}},
      ];
    }

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
        const {profileName, profilePicture, profileRating, profileID} = req.body;
        const profile = await Profile.findOneAndUpdate({profileID}, 
            {profileName, profilePicture, profileRating, profileID}, {upsert: true, setDefaultOnInsert: true});
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
    Profile,
  },
  startServer,
};
