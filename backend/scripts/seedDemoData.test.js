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
    Transaction,
  },
} = require('../index');

const {
  buildSeedConfigFromEnv,
  buildSeedDataset,
  deleteExistingSeedData,
  insertSeedDataset,
  parseDemoUserAssignments,
  parseDemoUserMap,
  resolveClerkUserByEmail,
  resolveClerkUserById,
  resolveSeedProfileIdentities,
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
    meetupDate: '2026-04-03',
    meetupTime: '15:00',
    paymentMethod: 'cash',
    message: 'Tagged offer',
    status: 'pending',
    seedTag,
  });
  const realOffer = await Offer.create({
    listingId: realItem._id,
    buyerClerkUserId: realBuyer.profileID,
    buyerDisplayName: realBuyer.profileName,
    sellerClerkUserId: realProfile.profileID,
    conversationId: realConversation._id,
    offeredPrice: 25,
    meetupLocation: 'Reitz Union',
    meetupDate: '2026-04-04',
    meetupTime: '13:00',
    paymentMethod: 'externalApp',
    message: 'Real offer',
    status: 'pending',
  });

  await Transaction.create({
    offerId: realOffer._id,
    listingId: realItem._id,
    conversationId: realConversation._id,
    buyerClerkUserId: realBuyer.profileID,
    sellerClerkUserId: realProfile.profileID,
    acceptedTerms: {
      price: 25,
      paymentMethod: 'externalApp',
      meetupHubId: 'reitz',
      meetupLocation: 'Reitz Union',
      pickupSpecifics: 'Real pickup specifics.',
      meetupDate: '2026-04-04',
      meetupTime: '13:00',
    },
    status: 'scheduled',
  });

  const taggedOffer = await Offer.findOne({listingId: taggedItem._id, buyerClerkUserId: taggedBuyer.profileID});
  await Transaction.create({
    offerId: taggedOffer._id,
    listingId: taggedItem._id,
    conversationId: taggedConversation._id,
    buyerClerkUserId: taggedBuyer.profileID,
    sellerClerkUserId: taggedProfile.profileID,
    acceptedTerms: {
      price: 18,
      paymentMethod: 'cash',
      meetupHubId: 'library-west',
      meetupLocation: 'Library West',
      pickupSpecifics: 'Tagged pickup specifics.',
      meetupDate: '2026-04-03',
      meetupTime: '15:00',
    },
    status: 'scheduled',
    seedTag,
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
            primary_email_address: {
              email_address: 'you@ufl.edu',
            },
            email_addresses: [{email_address: 'you@ufl.edu'}],
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

test('resolveClerkUserByEmail prefers an exact primary email match when Clerk returns multiple users', async () => {
  const clerkUser = await resolveClerkUserByEmail('dylan.long@ufl.edu', {
    clerkSecretKey: 'sk_test_123',
    fetchImpl: async () => ({
      ok: true,
      json: async () => [
        {
          id: 'user_wrong',
          first_name: 'Elliot',
          last_name: 'Alderson',
          primary_email_address: {
            email_address: 'dylan1120long@gmail.com',
          },
          email_addresses: [
            {email_address: 'dylan1120long@gmail.com'},
            {email_address: 'dylan.long@ufl.edu'},
          ],
          image_url: 'https://example.com/wrong.png',
        },
        {
          id: 'user_right',
          first_name: 'Dylan',
          last_name: 'Long',
          primary_email_address: {
            email_address: 'dylan.long@ufl.edu',
          },
          email_addresses: [
            {email_address: 'dylan.long@ufl.edu'},
          ],
          image_url: 'https://example.com/right.png',
        },
      ],
    }),
  });

  assert.equal(clerkUser.profileID, 'user_right');
  assert.equal(clerkUser.profileName, 'Dylan Long');
  assert.equal(clerkUser.profilePicture, 'https://example.com/right.png');
});

test('parseDemoUserMap supports mixed shorthand and object entries', () => {
  const parsed = parseDemoUserMap(
    JSON.stringify({
      presenter: 'you@ufl.edu',
      ava: 'user_ava123',
      cameron: {
        id: 'user_cam456',
        profileName: 'Cameron Real',
        profilePicture: 'https://example.com/cameron.png',
        clerkSecretKeyEnv: 'CAMERON_CLERK_SECRET_KEY',
      },
    })
  );

  assert.deepEqual(parsed, {
    presenter: {email: 'you@ufl.edu'},
    ava: {id: 'user_ava123'},
    cameron: {
      id: 'user_cam456',
      profileName: 'Cameron Real',
      profilePicture: 'https://example.com/cameron.png',
      clerkSecretKeyEnv: 'CAMERON_CLERK_SECRET_KEY',
    },
  });
});

test('buildSeedConfigFromEnv parses DEMO_USER_MAP', () => {
  const config = buildSeedConfigFromEnv({
    DEMO_USER_MAP: JSON.stringify({
      presenter: {email: 'presenter@ufl.edu'},
      ava: {id: 'user_ava123'},
    }),
  });

  assert.deepEqual(config.demoUserMap, {
    presenter: {email: 'presenter@ufl.edu'},
    ava: {id: 'user_ava123'},
  });
});

test('parseDemoUserAssignments supports ordered string and object entries', () => {
  const parsed = parseDemoUserAssignments(
    JSON.stringify([
      'presenter@ufl.edu',
      {
        email: 'second@ufl.edu',
        clerkSecretKeyEnv: 'SECONDARY_CLERK_SECRET_KEY',
      },
      {
        id: 'user_ava123',
        profileName: 'Real Ava',
      },
    ])
  );

  assert.deepEqual(parsed, [
    {email: 'presenter@ufl.edu'},
    {email: 'second@ufl.edu', clerkSecretKeyEnv: 'SECONDARY_CLERK_SECRET_KEY'},
    {id: 'user_ava123', profileName: 'Real Ava'},
  ]);
});

test('buildSeedConfigFromEnv parses DEMO_USER_ASSIGNMENTS', () => {
  const config = buildSeedConfigFromEnv({
    DEMO_USER_ASSIGNMENTS: JSON.stringify([
      'presenter@ufl.edu',
      {email: 'second@ufl.edu', clerkSecretKeyEnv: 'SECONDARY_CLERK_SECRET_KEY'},
    ]),
  });

  assert.deepEqual(config.demoUserAssignments, [
    {email: 'presenter@ufl.edu'},
    {email: 'second@ufl.edu', clerkSecretKeyEnv: 'SECONDARY_CLERK_SECRET_KEY'},
  ]);
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

test('resolveClerkUserById falls back cleanly without Clerk credentials', async () => {
  const clerkUser = await resolveClerkUserById('user_123', {
    clerkSecretKey: '',
    profileName: 'Fallback Name',
    profilePicture: 'https://example.com/fallback.png',
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
  });

  assert.deepEqual(clerkUser, {
    profileID: 'user_123',
    profileName: 'Fallback Name',
    profilePicture: 'https://example.com/fallback.png',
    source: 'clerk-id',
    email: '',
  });
});

test('resolveSeedProfileIdentities supports multiple mapped users', async () => {
  const config = buildTestConfig({
    env: {
      DEMO_USER_MAP: JSON.stringify({
        presenter: {email: 'presenter@ufl.edu', clerkSecretKeyEnv: 'PRESENTER_CLERK_SECRET_KEY'},
        ava: {
          id: 'user_ava123',
          profileName: 'Real Ava',
          profilePicture: 'https://example.com/ava.png',
          clerkSecretKey: 'sk_test_ava_inline',
        },
      }),
      PRESENTER_CLERK_SECRET_KEY: 'sk_test_presenter_env',
    },
  });

  const requestedUrls = [];
  const identities = await resolveSeedProfileIdentities(config, {
    fetchImpl: async (url, options = {}) => {
      requestedUrls.push(String(url));

      if (String(url).includes('email_address%5B%5D=presenter%40ufl.edu')) {
        assert.equal(options.headers.Authorization, 'Bearer sk_test_presenter_env');

        return {
          ok: true,
          json: async () => [
            {
              id: 'user_presenter',
              first_name: 'Presenter',
              last_name: 'Real',
              primary_email_address: {
                email_address: 'presenter@ufl.edu',
              },
              email_addresses: [{email_address: 'presenter@ufl.edu'}],
              image_url: 'https://example.com/presenter-real.png',
            },
          ],
        };
      }

      if (String(url).endsWith('/user_ava123')) {
        assert.equal(options.headers.Authorization, 'Bearer sk_test_ava_inline');

        return {
          ok: true,
          json: async () => ({
            id: 'user_ava123',
            first_name: 'Ava',
            last_name: 'Real',
            image_url: 'https://example.com/ava-real.png',
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    },
  });

  assert.equal(identities.presenter.profileID, 'user_presenter');
  assert.equal(identities.presenter.profileName, 'Presenter Real');
  assert.equal(identities.ava.profileID, 'user_ava123');
  assert.equal(identities.ava.profileName, 'Ava Real');
  assert.equal(identities.ava.profilePicture, 'https://example.com/ava-real.png');
  assert.equal(requestedUrls.length, 2);
});

test('resolveSeedProfileIdentities auto-assigns DEMO_USER_ASSIGNMENTS in preset order', async () => {
  const config = buildTestConfig({
    env: {
      DEMO_USER_ASSIGNMENTS: JSON.stringify([
        {email: 'presenter@ufl.edu', clerkSecretKeyEnv: 'PRESENTER_CLERK_SECRET_KEY'},
        {email: 'second@ufl.edu', clerkSecretKeyEnv: 'SECONDARY_CLERK_SECRET_KEY'},
        {id: 'user_priya123'},
      ]),
      PRESENTER_CLERK_SECRET_KEY: 'sk_test_presenter',
      SECONDARY_CLERK_SECRET_KEY: 'sk_test_secondary',
    },
  });

  const requestedUrls = [];
  const identities = await resolveSeedProfileIdentities(config, {
    fetchImpl: async (url, options = {}) => {
      requestedUrls.push(String(url));

      if (String(url).includes('email_address%5B%5D=presenter%40ufl.edu')) {
        assert.equal(options.headers.Authorization, 'Bearer sk_test_presenter');
        return {
          ok: true,
          json: async () => [
            {
              id: 'user_presenter',
              first_name: 'Presenter',
              last_name: 'Real',
              primary_email_address: {
                email_address: 'presenter@ufl.edu',
              },
              email_addresses: [{email_address: 'presenter@ufl.edu'}],
              image_url: 'https://example.com/presenter-real.png',
            },
          ],
        };
      }

      if (String(url).includes('email_address%5B%5D=second%40ufl.edu')) {
        assert.equal(options.headers.Authorization, 'Bearer sk_test_secondary');
        return {
          ok: true,
          json: async () => [
            {
              id: 'user_ava',
              first_name: 'Second',
              last_name: 'User',
              primary_email_address: {
                email_address: 'second@ufl.edu',
              },
              email_addresses: [{email_address: 'second@ufl.edu'}],
              image_url: 'https://example.com/second-user.png',
            },
          ],
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    },
  });

  assert.equal(identities.presenter.profileID, 'user_presenter');
  assert.equal(identities.leo.profileID, 'user_ava');
  assert.equal(identities.priya.profileID, 'user_priya123');
  assert.equal(identities.priya.profileName, 'Priya Shah');
  assert.equal(requestedUrls.length, 2);
});

test('resolveSeedProfileIdentities errors when a per-user Clerk secret env var is missing', async () => {
  const config = buildTestConfig({
    env: {
      DEMO_USER_MAP: JSON.stringify({
        presenter: {email: 'presenter@ufl.edu', clerkSecretKeyEnv: 'MISSING_SECRET_KEY'},
      }),
    },
  });

  await assert.rejects(
    () => resolveSeedProfileIdentities(config, {
      fetchImpl: async () => {
        throw new Error('fetch should not be called');
      },
    }),
    /Missing Clerk secret key in env var "MISSING_SECRET_KEY"/
  );
});

test('tag-only cleanup removes only tagged records and preserves unrelated data', async () => {
  const config = buildTestConfig();
  const setup = await createTaggedAndRealRecords(config.seedTag);

  const cleanupSummary = await deleteExistingSeedData(config);

  assert.equal(cleanupSummary.mode, 'tag-only cleanup');
  assert.equal(await Message.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Conversation.countDocuments({seedTag: config.seedTag}), 0);
  assert.equal(await Transaction.countDocuments({seedTag: config.seedTag}), 0);
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
  assert.equal(await Transaction.countDocuments(), 0);
  assert.equal(await Offer.countDocuments(), 0);
  assert.equal(await Item.countDocuments(), 0);
  assert.equal(await Profile.countDocuments(), 0);
});

test('buildSeedDataset creates the expected presentation-ready shape', () => {
  const config = buildTestConfig();
  const dataset = buildSeedDataset(config);

  assert.equal(dataset.presenterProfile.profileID, 'presenter_demo_user');
  assert.equal(dataset.communityProfiles.length, 10);
  assert.equal(dataset.listings.length, 23);
  assert.equal(dataset.offers.length, 29);
  assert.equal(dataset.transactions.length, 8);
  assert.equal(dataset.conversations.length, 18);
  assert.deepEqual(dataset.deletedListingKeys, ['shoe-rack']);

  const presenterListings = dataset.listings.filter((listing) => listing.ownerKey === 'presenter');
  assert.equal(presenterListings.length, 4);
  assert.deepEqual(
    presenterListings.map((listing) => listing.status).sort(),
    ['active', 'active', 'reserved', 'reserved']
  );

  const reservedListing = dataset.listings.find((listing) => listing.key === 'desk-lamp');
  const activeListing = dataset.listings.find((listing) => listing.key === 'mini-fridge');
  const problemTransaction = dataset.transactions.find((transaction) => transaction.key === 'transaction-gaming-monitor-presenter');
  const completedTransactions = dataset.transactions.filter((transaction) => transaction.status === 'completed');
  const inFlightTransactions = dataset.transactions.filter((transaction) => ['scheduled', 'buyerConfirmed', 'sellerConfirmed'].includes(transaction.status));

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
    3
  );
  assert.equal(reservedListing.originalPickupHubId, 'library-west');
  assert.equal(reservedListing.pickupHubId, 'reitz');
  assert.equal(
    dataset.conversations.find((conversation) => conversation.key === 'conv-desk-lamp-ethan').activePickupHubId,
    'reitz'
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-presenter-jasmine').linkedListingKeys,
    ['mini-fridge', 'sublease-room', 'storage-drawers', 'standing-desk', 'shoe-rack']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-mini-fridge-noah').linkedListingKeys,
    ['desk-lamp', 'mini-fridge']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-backpack-presenter').linkedListingKeys,
    ['textbook-bundle', 'backpack']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-stroller-ava').linkedListingKeys,
    ['board-game', 'stroller-organizer', 'storage-drawers']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-presenter-cameron').linkedListingKeys,
    ['air-purifier', 'rolling-cart']
  );
  assert.equal(
    dataset.conversations.some((conversation) => conversation.key === 'conv-rolling-cart-leo'),
    true
  );
  assert.equal(
    dataset.conversations.some((conversation) => conversation.key === 'conv-mini-fridge-priya'),
    true
  );
  assert.equal(
    dataset.conversations.some((conversation) => conversation.key === 'conv-rolling-cart-sofia'),
    true
  );
  assert.equal(
    dataset.conversations.some((conversation) => conversation.key === 'conv-air-purifier-nina'),
    true
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-sofia-presenter').linkedListingKeys,
    ['gaming-monitor', 'kitchen-cart', 'rolling-cart']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-nina-presenter').linkedListingKeys,
    ['vanity-mirror', 'lab-stool', 'air-purifier']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-rolling-cart-leo').linkedListingKeys,
    ['desk-lamp', 'headphones', 'scooter', 'mini-fridge', 'rolling-cart']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-mini-fridge-priya').linkedListingKeys,
    ['board-game', 'stroller-organizer', 'mini-fridge']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-rolling-cart-sofia').linkedListingKeys,
    ['gaming-monitor', 'kitchen-cart', 'rolling-cart']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-air-purifier-nina').linkedListingKeys,
    ['vanity-mirror', 'lab-stool', 'air-purifier']
  );
  assert.deepEqual(
    dataset.conversations.find((conversation) => conversation.key === 'conv-leo-ava-calculator').linkedListingKeys,
    ['headphones', 'scooter', 'graphing-calculator']
  );
  assert.equal(
    dataset.conversations
      .find((conversation) => conversation.key === 'conv-presenter-jasmine')
      .messages.some((message) => message.attachedListingKey === 'shoe-rack'),
    true
  );
  assert.equal(
    dataset.conversations
      .find((conversation) => conversation.key === 'conv-desk-lamp-ethan')
      .messages.some((message) => message.offerKey === 'offer-desk-lamp-ethan' && message.offerEventType === 'accepted'),
    true
  );
  assert.equal(
    dataset.conversations
      .find((conversation) => conversation.key === 'conv-stroller-ava')
      .messages.filter((message) => message.offerEventType === 'sent').length,
    2
  );
  assert.equal(
    dataset.conversations
      .find((conversation) => conversation.key === 'conv-presenter-cameron')
      .messages.filter((message) => message.offerEventType === 'sent').length,
    2
  );
  assert.equal(
    ['presenter', 'leo', 'priya', 'sofia', 'nina'].every((profileKey) => {
      const listingCount = dataset.listings.filter((listing) => listing.ownerKey === profileKey).length;
      const buyingOfferCount = dataset.offers.filter((offer) => offer.buyerKey === profileKey).length;
      const conversationCount = dataset.conversations.filter((conversation) => conversation.participantKeys.includes(profileKey)).length;
      const hasMultiItemThread = dataset.conversations.some(
        (conversation) =>
          conversation.participantKeys.includes(profileKey) &&
          ((conversation.linkedListingKeys || []).length >= 3)
      );

      return listingCount >= 2 && buyingOfferCount >= 1 && conversationCount >= 2 && hasMultiItemThread;
    }),
    true
  );
  assert.ok(dataset.offers.some((offer) => offer.buyerKey === 'presenter'));
  assert.equal(
    dataset.offers.some(
      (offer) => offer.status === 'accepted' && offer.meetupDate === '2026-03-31'
    ),
    true
  );
  assert.equal(completedTransactions.length >= 3, true);
  assert.equal(inFlightTransactions.length >= 4, true);
  assert.ok(problemTransaction);
  assert.equal(problemTransaction.status, 'problemReported');
  assert.equal(problemTransaction.buyerDecision, 'problemReported');
  assert.equal(problemTransaction.sellerDecision, 'confirmed');
  assert.equal(
    dataset.conversations.find((conversation) => conversation.key === 'conv-desk-lamp-ava').lastReadHoursAgoByParticipant.presenter > 18.4,
    true
  );
  assert.equal(
    dataset.conversations.find((conversation) => conversation.key === 'conv-presenter-jasmine').lastReadHoursAgoByParticipant.presenter > 2.7,
    true
  );
  assert.equal(
    dataset.conversations.find((conversation) => conversation.key === 'conv-mini-fridge-noah').lastReadHoursAgoByParticipant.noah > 12.9,
    true
  );
});

test('buildSeedDataset applies profile identity overrides for mapped users', () => {
  const config = buildTestConfig({
    profileIdentityOverrides: {
      presenter: {
        profileID: 'user_presenter',
        profileName: 'Real Presenter',
        profilePicture: 'https://example.com/real-presenter.png',
        source: 'clerk-email',
      },
      ava: {
        profileID: 'user_ava123',
        profileName: 'Real Ava',
        profilePicture: 'https://example.com/real-ava.png',
        source: 'clerk-id',
      },
    },
    presenterIdentity: {
      profileID: 'user_presenter',
      profileName: 'Real Presenter',
      profilePicture: 'https://example.com/real-presenter.png',
      source: 'clerk-email',
      email: 'presenter@ufl.edu',
    },
  });
  const dataset = buildSeedDataset(config);
  const avaProfile = dataset.communityProfiles.find((profile) => profile.key === 'ava');

  assert.equal(dataset.presenterProfile.profileID, 'user_presenter');
  assert.equal(dataset.presenterProfile.profileName, 'Real Presenter');
  assert.equal(avaProfile.profileID, 'user_ava123');
  assert.equal(avaProfile.profileName, 'Real Ava');
  assert.equal(avaProfile.profilePicture, 'https://example.com/real-ava.png');
  assert.equal(avaProfile.seedTag, null);
});

test('insertSeedDataset wires accepted offers, conversations, and favorites correctly', async () => {
  const config = buildTestConfig();
  const dataset = buildSeedDataset(config);

  const summary = await insertSeedDataset(dataset, config);

  const reservedListing = await Item.findOne({itemName: 'Desk Lamp'});
  const acceptedOffer = await Offer.findOne({
    listingId: reservedListing._id,
    status: 'accepted',
  });
  const acceptedConversation = await Conversation.findById(acceptedOffer.conversationId).lean();
  const offers = await Offer.find().lean();
  const conversations = await Conversation.find().lean();
  const items = await Item.find().lean();
  const profiles = await Profile.find().lean();
  const transactions = await Transaction.find().lean();
  const kitchenCartItem = items.find((item) => item.itemName === 'Kitchen Utility Cart');
  const labStoolItem = items.find((item) => item.itemName === 'Drafting Lab Stool');
  const presenterJasmineConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.jasmine.profileID].sort(),
  }).lean();
  const presenterNoahConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.noah.profileID].sort(),
  }).lean();
  const presenterMateoConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.mateo.profileID].sort(),
  }).lean();
  const avaPriyaConversation = await Conversation.findOne({
    participantIds: [dataset.profilesByKey.ava.profileID, dataset.profilesByKey.priya.profileID].sort(),
  }).lean();
  const presenterCameronConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.cameron.profileID].sort(),
  }).lean();
  const presenterSofiaConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.sofia.profileID].sort(),
    activeListingId: kitchenCartItem._id,
  }).lean();
  const presenterNinaConversation = await Conversation.findOne({
    participantIds: [dataset.presenterProfile.profileID, dataset.profilesByKey.nina.profileID].sort(),
    activeListingId: labStoolItem._id,
  }).lean();
  const deletedItemMessage = await Message.findOne({
    conversationId: presenterJasmineConversation._id,
    attachedListingTitle: 'Narrow Shoe Rack',
  }).lean();
  const ethanOfferSentMessage = await Message.findOne({
    conversationId: acceptedConversation._id,
    'offerSnapshot.eventType': 'sent',
  }).lean();

  assert.equal(String(reservedListing.reservedOfferId), String(acceptedOffer._id));
  assert.equal(reservedListing.originalPickupHubId, 'library-west');
  assert.equal(reservedListing.originalItemLocation, 'Library West');
  assert.equal(reservedListing.pickupHubId, 'reitz');
  assert.equal(reservedListing.itemLocation, 'Reitz Union');
  assert.equal(acceptedOffer.meetupHubId, 'marston');
  assert.equal(acceptedOffer.meetupLocation, 'Marston Science Library');
  assert.equal(acceptedOffer.meetupDate, '2026-04-01');
  assert.equal(acceptedOffer.meetupTime, '12:15');
  assert.equal(acceptedConversation.activePickupHubId, 'reitz');
  assert.equal(acceptedConversation.activePickupSpecifics, 'Ground floor entrance by the benches.');
  assert.equal(offers.every((offer) => Boolean(offer.conversationId)), true);
  assert.equal(conversations.every((conversation) => conversation.participantIds.length === 2), true);
  assert.equal(items.some((item) => item.itemName === 'Narrow Shoe Rack'), false);
  assert.equal(presenterJasmineConversation.linkedListingIds.length, 5);
  assert.equal(presenterNoahConversation.linkedListingIds.length, 2);
  assert.equal(presenterMateoConversation.linkedListingIds.length, 2);
  assert.equal(avaPriyaConversation.linkedListingIds.length, 3);
  assert.equal(presenterCameronConversation.linkedListingIds.length, 2);
  assert.equal(presenterSofiaConversation.linkedListingIds.length, 3);
  assert.equal(presenterNinaConversation.linkedListingIds.length, 3);
  assert.ok(presenterJasmineConversation.lastReadAtByUser[dataset.presenterProfile.profileID]);
  assert.ok(presenterNoahConversation.lastReadAtByUser[dataset.profilesByKey.noah.profileID]);
  assert.ok(new Date(presenterJasmineConversation.lastReadAtByUser[dataset.presenterProfile.profileID]) < new Date(presenterJasmineConversation.lastMessageAt));
  assert.ok(new Date(presenterNoahConversation.lastReadAtByUser[dataset.profilesByKey.noah.profileID]) < new Date(presenterNoahConversation.lastMessageAt));
  assert.ok(deletedItemMessage);
  assert.equal(deletedItemMessage.attachedListingImageUrl.length > 0, true);
  assert.equal(await Item.countDocuments({_id: deletedItemMessage.attachedListingId}), 0);
  assert.ok(ethanOfferSentMessage);
  assert.equal(ethanOfferSentMessage.offerSnapshot.eventType, 'sent');
  assert.equal(ethanOfferSentMessage.offerSnapshot.offeredPrice, 25);

  const systemMessages = await Message.find({
    conversationId: acceptedConversation._id,
    senderClerkUserId: 'system',
  }).sort({createdAt: 1}).lean();
  assert.equal(systemMessages.length, 3);
  assert.match(systemMessages[0].body, /Ethan/);
  assert.equal(systemMessages[0].offerSnapshot.eventType, 'sent');
  assert.match(systemMessages[1].body, /accepted your offer\./);
  assert.equal(systemMessages[1].offerSnapshot.eventType, 'accepted');
  assert.match(systemMessages[2].body, /Meetup details updated to Reitz Union/);

  const vanityMirrorOffer = offers.find((offer) => offer.message.includes('carry the mirror back right away'));
  const airPurifierOffer = offers.find((offer) => offer.message.includes('come by tonight and keep the handoff short'));
  const standingDeskListing = await Item.findOne({itemName: 'Compact Standing Desk'});
  const airPurifierListing = await Item.findOne({itemName: 'Compact Air Purifier'});
  const vanityMirrorListing = await Item.findOne({itemName: 'Lighted Vanity Mirror'});
  const gamingMonitorListing = await Item.findOne({itemName: '24-inch Gaming Monitor'});
  const standingDeskTransaction = transactions.find(
    (transaction) => String(transaction.listingId) === String(standingDeskListing._id)
  );
  const gamingMonitorTransaction = transactions.find(
    (transaction) => String(transaction.listingId) === String(gamingMonitorListing._id)
  );

  assert.equal(summary.counts.transactions, dataset.transactions.length);
  assert.equal(transactions.length, dataset.transactions.length);
  assert.equal(standingDeskTransaction.status, 'completed');
  assert.equal(gamingMonitorTransaction.status, 'problemReported');
  assert.equal(vanityMirrorOffer.status, 'convertedToTransaction');
  assert.equal(gamingMonitorListing.status, 'sold');
  assert.equal(vanityMirrorListing.status, 'sold');
  assert.equal(airPurifierListing.status, 'reserved');
  assert.equal(String(airPurifierListing.reservedOfferId), String(airPurifierOffer._id));

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

  assert.equal(await Profile.countDocuments({seedTag: config.seedTag}), secondDataset.communityProfiles.length);
  assert.equal(
    await Item.countDocuments({seedTag: config.seedTag}),
    secondDataset.listings.length - secondDataset.deletedListingKeys.length
  );
  assert.equal(await Offer.countDocuments({seedTag: config.seedTag}), secondDataset.offers.length);
  assert.equal(await Transaction.countDocuments({seedTag: config.seedTag}), secondDataset.transactions.length);
  assert.equal(await Conversation.countDocuments({seedTag: config.seedTag}), secondDataset.conversations.length);
  assert.equal(
    await Message.countDocuments({seedTag: config.seedTag}),
    secondDataset.conversations.reduce((count, conversation) => count + conversation.messages.length, 0)
  );

  assert.equal(await Item.countDocuments({_id: unrelatedItem._id}), 1);
  assert.equal(await Profile.countDocuments({profileID: unrelatedProfile.profileID}), 1);

  const presenterProfile = await Profile.findOne({profileID: config.presenterIdentity.profileID});
  const presenterFavorites = presenterProfile.profileFavorites.map(String);
  const presenterSeedFavorites = secondDataset.favorites.find((favoriteGroup) => favoriteGroup.profileKey === 'presenter');

  assert.equal(presenterFavorites.includes(String(unrelatedItem._id)), true);
  assert.equal(presenterFavorites.length, presenterSeedFavorites.listingKeys.length + 1);
});
