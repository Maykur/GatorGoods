// REFERENCE: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();

mongoose.connect(process.env.mongo_url).then(() => {
  console.log('Connected to database');
});

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

const Item = mongoose.model('items', ItemSchema);
const Profile = mongoose.model('profiles', profileSchema);
const Conversation = mongoose.model('conversations', conversationSchema);
const Message = mongoose.model('messages', messageSchema);

function normalizeParticipantIds(participantIds = []) {
  return [...new Set(participantIds.map((participantId) => participantId?.trim()).filter(Boolean))].sort();
}

app.use(express.json({ limit: '10mb' }));
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);

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
    const items = await Item.find();
    resp.json(items);
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
        const item = await Item.findById(req.params.item);
        if (!item) {
            return res.status(404).json({message: 'Not found'});
        }
        await Item.findByIdAndDelete(req.params.item);
        await Profile.updateMany({profileFavorites: req.params.item}, {$pull:{profileFavorites: req.params.item}});
        res.json({message: "Listing deleted"});
    } catch (e) {
        resp.status(500).json({error: e.message})
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

app.listen(5000, () => {
  console.log('App is running on port 5000');
});
