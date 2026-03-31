const test = require('node:test');
const assert = require('node:assert/strict');
const {MongoMemoryServer} = require('mongodb-memory-server');

const {
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
} = require('../index');

const {
  buildSeedConfigFromEnv,
  buildSeedDataset,
  deleteExistingSeedData,
  insertSeedDataset,
  resolveClerkUserByEmail,
} = require('./seedDemoData');

let mongoServer;

function buildTestConfig(overrides = {}) {
  const env = {
    SEED_TAG: 'test-demo-tag',
    FAKER_SEED: '20260401',
    ...overrides.env,
  };
  const config = buildSeedConfigFromEnv(env);

  config.now = overrides.now || new Date('2026-03-31T16:00:00.000Z');
  config.presenterIdentity = overrides.presenterIdentity || {
    profileID: 'presenter_demo_user',
    profileName: 'Presenter Demo',
    profilePicture: 'https://example.com/presenter.png',
    source: 'test',
    email: '',
  };

  Object.entries(overrides).forEach(([key, value]) => {
    if (key !== 'env' && key !== 'now' && key !== 'presenterIdentity') {
      config[key] = value;
    }
  });

  return config;
}

async function createProfile(overrides = {}) {
  return Profile.create({
    profileID: 'profile_default',
    profileName: 'Default Profile',
    profilePicture: 'https://example.com/profile.png',
    profileBanner: 'https://example.com/banner.png',
    profileBio: 'Default bio',
    instagramUrl: '',
    linkedinUrl: '',
    ufVerified: true,
    profileRating: 4.5,
    profileTotalRating: 8,
    trustMetrics: {
      reliability: 90,
      accuracy: 91,
      responsiveness: 92,
      safety: 93,
    },
    ...overrides,
  });
}

async function createItem(ownerProfile, overrides = {}) {
  return Item.create({
    itemName: 'Desk Lamp',
    itemCost: '20',
    itemCondition: 'Good',
    itemLocation: 'Library West',
    itemPicture: 'https://example.com/item.png',
    itemDescription: 'Lamp for studying',
    itemDetails: 'Warm bulb included',
    userPublishingID: ownerProfile.profileID,
    userPublishingName: ownerProfile.profileName,
    itemCat: 'Home & Garden',
    status: 'active',
    ...overrides,
  });
}

async function createTaggedAndRealRecords(seedTag) {
  const taggedProfile = await createProfile({
    profileID: 'tagged_profile',
    profileName: 'Tagged Profile',
    seedTag,
  });
  const realProfile = await createProfile({
    profileID: 'real_profile',
    profileName: 'Real Profile',
  });
  const taggedBuyer = await createProfile({
    profileID: 'tagged_buyer',
    profileName: 'Tagged Buyer',
    seedTag,
  });
  const realBuyer = await createProfile({
    profileID: 'real_buyer',
    profileName: 'Real Buyer',
  });

  const taggedItem = await createItem(taggedProfile, {
    itemName: 'Tagged Item',
    seedTag,
  });
  const realItem = await createItem(realProfile, {
    itemName: 'Real Item',
  });

  await Profile.findOneAndUpdate(
    {profileID: realProfile.profileID},
    {
      $set: {
        profileFavorites: [String(taggedItem._id), String(realItem._id)],
      },
    }
  );

  const taggedConversation = await Conversation.create({
    participantIds: [taggedProfile.profileID, taggedBuyer.profileID].sort(),
    linkedListingIds: [taggedItem._id],
    activeListingId: taggedItem._id,
    lastMessageText: 'Tagged conversation',
    lastMessageAt: new Date('2026-03-31T12:00:00.000Z'),
    seedTag,
  });
  const realConversation = await Conversation.create({
    participantIds: [realProfile.profileID, realBuyer.profileID].sort(),
    linkedListingIds: [realItem._id],
    activeListingId: realItem._id,
    lastMessageText: 'Real conversation',
    lastMessageAt: new Date('2026-03-31T11:00:00.000Z'),
  });

  await Message.create({
    conversationId: taggedConversation._id,
    senderClerkUserId: taggedBuyer.profileID,
    body: 'Tagged message',
    attachedListingId: taggedItem._id,
    seedTag,
  });
  await Message.create({
    conversationId: realConversation._id,
    senderClerkUserId: realBuyer.profileID,
    body: 'Real message',
    attachedListingId: realItem._id,
  });

  await Offer.create({
    listingId: taggedItem._id,
    buyerClerkUserId: taggedBuyer.profileID,
    buyerDisplayName: taggedBuyer.profileName,
    sellerClerkUserId: taggedProfile.profileID,
    conversationId: taggedConversation._id,
    offeredPrice: 18,
    meetupLocation: 'Library West',
    meetupWindow: 'Today 3:00 PM - 3:15 PM',
    paymentMethod: 'cash',
    message: 'Tagged offer',
    status: 'pending',
    seedTag,
  });
  await Offer.create({
    listingId: realItem._id,
    buyerClerkUserId: realBuyer.profileID,
    buyerDisplayName: realBuyer.profileName,
    sellerClerkUserId: realProfile.profileID,
    conversationId: realConversation._id,
    offeredPrice: 25,
    meetupLocation: 'Reitz Union',
    meetupWindow: 'Tomorrow 1:00 PM - 1:15 PM',
    paymentMethod: 'externalApp',
    message: 'Real offer',
    status: 'pending',
  });

  return {
    taggedItem,
    realItem,
    realProfileId: realProfile.profileID,
    realConversationId: realConversation._id,
  };
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectToDatabase(mongoServer.getUri());
});

test.after(async () => {
  await disconnectFromDatabase();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.beforeEach(async () => {
  await clearDatabase();
});

test('resolveClerkUserByEmail succeeds on a mocked Clerk response', async () => {
  const clerkUser = await resolveClerkUserByEmail('you@ufl.edu', {
    clerkSecretKey: 'sk_test_123',
    fetchImpl: async (url, options) => {
      assert.match(String(url), /email_address%5B%5D=you%40ufl\.edu/);
      assert.equal(options.headers.Authorization, 'Bearer sk_test_123');

      return {
        ok: true,
        json: async () => [
          {
            id: 'user_123',
            first_name: 'Taylor',
            last_name: 'Gator',
            image_url: 'https://example.com/clerk-avatar.png',
          },
        ],
      };
    },
  });

  assert.equal(clerkUser.profileID, 'user_123');
  assert.equal(clerkUser.profileName, 'Taylor Gator');
  assert.equal(clerkUser.profilePicture, 'https://example.com/clerk-avatar.png');
});

test('resolveClerkUserByEmail errors when CLERK_SECRET_KEY is missing', async () => {
  await assert.rejects(
    () => resolveClerkUserByEmail('you@ufl.edu', {
      clerkSecretKey: '',
      fetchImpl: async () => {
        throw new Error('fetch should not be called');
      },
    }),
    /CLERK_SECRET_KEY is required when DEMO_USER_EMAIL is set/
  );
});

test('resolveClerkUserByEmail errors when no Clerk user is returned', async () => {
  await assert.rejects(
    () => resolveClerkUserByEmail('missing@ufl.edu', {
      clerkSecretKey: 'sk_test_123',
      fetchImpl: async () => ({
        ok: true,
        json: async () => [],
      }),
    }),
    /No Clerk user was found for missing@ufl\.edu/
  );
});

test('tag-only cleanup removes only tagged records and preserves unrelated data', async () => {
  const config = buildTestConfig();
  const setup = await createTaggedAndRealRecords(config.seedTag);

  const cleanupSummary = await deleteExistingSeedData(config);

  assert.equal(cleanupSummary.mode, 'tag-only cleanup');
  assert.equal(await Message.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Conversation.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Offer.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Item.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Profile.countDocuments({seedTag: config.seedTag}), 0);

  assert.equal(await Item.countDocuments({_id: setup.realItem._id}), 1);
  assert.equal(await Conversation.countDocuments({_id: setup.realConversationId}), 1);
  const realProfile = await Profile.findOne({profileID: setup.realProfileId});
  assert.deepEqual(realProfile.profileFavorites.map(String), [String(setup.realItem._id)]);
});

test('full reset cleanup clears everything', async () => {
  const config = buildTestConfig({fullReset: true});
  await createTaggedAndRealRecords(config.seedTag);

  const cleanupSummary = await deleteExistingSeedData(config);

  assert.equal(cleanupSummary.mode, 'full reset');
  assert.equal(await Message.countDocuments(), 0);
  assert.equal(await Conversation.countDocuments(), 0);
  assert.equal(await Offer.countDocuments(), 0);
  assert.equal(await Item.countDocuments(), 0);
  assert.equal(await Profile.countDocuments(), 0);
});

test('buildSeedDataset creates the expected presentation-ready shape', () => {
  const config = buildTestConfig();
  const dataset = buildSeedDataset(config);

  assert.equal(dataset.presenterProfile.profileID, 'presenter_demo_user');
  assert.equal(dataset.communityProfiles.length, 7);
  assert.equal(dataset.listings.length, 12);
  assert.equal(dataset.offers.length, 9);
  assert.equal(dataset.conversations.length, 8);

  const presenterListings = dataset.listings.filter((listing) => listing.ownerKey === 'presenter');
  assert.equal(presenterListings.length, 2);
  assert.deepEqual(
    presenterListings.map((listing) => listing.status).sort(),
    ['active', 'reserved']
  );

  const activeListing = dataset.listings.find((listing) => listing.key === 'desk-lamp');
  const reservedListing = dataset.listings.find((listing) => listing.key === 'mini-fridge');

  assert.equal(
    dataset.offers.filter((offer) => offer.listingKey === activeListing.key && offer.status === 'pending').length,
    3
  );
  assert.equal(
    dataset.offers.filter((offer) => offer.listingKey === reservedListing.key && offer.status === 'accepted').length,
    1
  );
  assert.equal(
    dataset.offers.filter((offer) => offer.listingKey === reservedListing.key && offer.status === 'declined').length,
    1
  );
  assert.ok(dataset.offers.some((offer) => offer.buyerKey === 'presenter'));
});

test('insertSeedDataset wires accepted offers, conversations, and favorites correctly', async () => {
  const config = buildTestConfig();
  const dataset = buildSeedDataset(config);

  await insertSeedDataset(dataset, config);

  const reservedListing = await Item.findOne({itemName: 'Mini Fridge'});
  const acceptedOffer = await Offer.findOne({
    listingId: reservedListing._id,
    status: 'accepted',
  });
  const offers = await Offer.find().lean();
  const conversations = await Conversation.find().lean();
  const items = await Item.find().lean();
  const profiles = await Profile.find().lean();

  assert.equal(String(reservedListing.reservedOfferId), String(acceptedOffer._id));
  assert.equal(offers.every((offer) => Boolean(offer.conversationId)), true);
  assert.equal(conversations.every((conversation) => conversation.participantIds.length === 2), true);

  const itemIds = new Set(items.map((item) => String(item._id)));
  profiles.forEach((profile) => {
    profile.profileFavorites.forEach((favoriteId) => {
      assert.equal(itemIds.has(String(favoriteId)), true);
    });
  });
});

test('running tag-only cleanup and seed twice does not duplicate tagged data and preserves unrelated data', async () => {
  const config = buildTestConfig({seedTag: 'repeatable-demo-tag'});
  const firstDataset = buildSeedDataset(config);

  await insertSeedDataset(firstDataset, config);

  const unrelatedProfile = await createProfile({
    profileID: 'real_preserved_profile',
    profileName: 'Real Preserved Profile',
  });
  const unrelatedItem = await createItem(unrelatedProfile, {
    itemName: 'Real Preserved Item',
  });

  await Profile.findOneAndUpdate(
    {profileID: config.presenterIdentity.profileID},
    {
      $addToSet: {
        profileFavorites: String(unrelatedItem._id),
      },
    }
  );

  await deleteExistingSeedData(config);
  const secondDataset = buildSeedDataset(config);
  await insertSeedDataset(secondDataset, config);

  assert.equal(await Profile.countDocuments({seedTag: config.seedTag}), 7);
  assert.equal(await Item.countDocuments({seedTag: config.seedTag}), 12);
  assert.equal(await Offer.countDocuments({seedTag: config.seedTag}), 9);
  assert.equal(await Conversation.countDocuments({seedTag: config.seedTag}), 8);
  assert.equal(await Message.countDocuments({seedTag: config.seedTag}), 25);

  assert.equal(await Item.countDocuments({_id: unrelatedItem._id}), 1);
  assert.equal(await Profile.countDocuments({profileID: unrelatedProfile.profileID}), 1);

  const presenterProfile = await Profile.findOne({profileID: config.presenterIdentity.profileID});
  const presenterFavorites = presenterProfile.profileFavorites.map(String);

  assert.equal(presenterFavorites.includes(String(unrelatedItem._id)), true);
  assert.equal(presenterFavorites.length, 4);
});
