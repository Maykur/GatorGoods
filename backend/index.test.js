const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {MongoMemoryServer} = require('mongodb-memory-server');

const {
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
} = require('./index');

let mongoServer;

async function seedProfileAndItem(overrides = {}) {
  const profile = await Profile.create({
    profileID: 'user_1',
    profileName: 'Seller One',
    profilePicture: 'https://example.com/seller.png',
    ...overrides.profile,
  });

  const item = await Item.create({
    itemName: 'Desk Lamp',
    itemCost: '20',
    itemCondition: 'Good',
    itemLocation: 'Library West',
    itemPicture: 'data:image/png;base64,abc123',
    itemDescription: 'Lamp for studying',
    itemDetails: 'Warm bulb included',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    ...overrides.item,
  });

  return {item, profile};
}

async function createOffer(listingId, overrides = {}) {
  return request(app)
    .post(`/api/listings/${listingId}/offers`)
    .send({
      buyerClerkUserId: 'buyer_1',
      buyerDisplayName: 'Buyer One',
      offeredPrice: 18,
      meetupLocation: 'Plaza of the Americas',
      meetupWindow: 'Tue 1:00 PM - 2:00 PM',
      paymentMethod: 'cash',
      message: 'Can meet after class.',
      ...overrides,
    });
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

test('GET /items returns seeded items', async () => {
  const {item} = await seedProfileAndItem();

  const response = await request(app).get('/items');

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0]._id, item.id);
});

test('GET /items supports paginated query mode', async () => {
  await seedProfileAndItem();
  await seedProfileAndItem({
    profile: {
      profileID: 'user_2',
      profileName: 'Seller Two',
    },
    item: {
      itemName: 'Bike Helmet',
      itemCost: '15',
      itemCat: 'Miscellaneous',
    },
  });

  const response = await request(app)
    .get('/items')
    .query({
      page: 1,
      limit: 1,
      search: 'Bike',
      sort: 'title',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].itemName, 'Bike Helmet');
  assert.equal(response.body.items[0].itemPictureUrl, `/items/${response.body.items[0]._id}/image`);
  assert.equal(response.body.items[0].itemPicture, undefined);
  assert.equal(response.body.items[0].itemDescription, undefined);
  assert.equal(response.body.items[0].itemDetails, undefined);
  assert.equal(response.body.meta.totalItems, 1);
  assert.equal(response.body.meta.page, 1);
  assert.equal(response.body.meta.totalPages, 1);
});

test('GET /items/:id/image serves stored data-url images', async () => {
  const profile = await Profile.create({
    profileID: 'user_svg',
    profileName: 'Seller SVG',
    profilePicture: '',
  });
  const item = await Item.create({
    itemName: 'Poster',
    itemCost: '10',
    itemCondition: 'Good',
    itemLocation: 'Library West',
    itemPicture: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"></svg>')}`,
    itemDescription: 'Poster description',
    itemDetails: 'Poster details',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });

  const response = await request(app).get(`/items/${item.id}/image`);

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^image\/svg\+xml/);
  assert.match(Buffer.from(response.body).toString('utf8'), /<svg/);
});

test('GET /items filters listings by approved pickup location', async () => {
  await seedProfileAndItem({
    item: {
      pickupHubId: 'library-west',
      pickupArea: 'Historic Core',
    },
  });
  await seedProfileAndItem({
    profile: {
      profileID: 'user_2',
      profileName: 'Seller Two',
    },
    item: {
      itemName: 'Marston Whiteboard',
      itemLocation: 'Marston Science Library',
      pickupHubId: 'marston',
      pickupArea: 'East Core',
    },
  });

  const response = await request(app)
    .get('/items')
    .query({
      page: 1,
      limit: 9,
      pickupLocation: 'Library West',
      sort: 'newest',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].itemName, 'Desk Lamp');
  assert.equal(response.body.meta.totalItems, 1);
});

test('GET /items rejects unknown pickup locations', async () => {
  const response = await request(app)
    .get('/items')
    .query({
      page: 1,
      limit: 9,
      pickupLocation: 'Midtown',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'pickupLocation must match an approved pickup hub');
});

test('GET /items search only matches the original public pickup location when a listing has moved', async () => {
  await seedProfileAndItem({
    item: {
      originalPickupHubId: 'library-west',
      originalPickupArea: 'Historic Core',
      originalItemLocation: 'Library West',
      pickupHubId: 'reitz',
      pickupArea: 'South Core',
      itemLocation: 'Reitz Union',
      status: 'reserved',
    },
  });

  const response = await request(app)
    .get('/items')
    .query({
      page: 1,
      limit: 9,
      search: 'Reitz',
      sort: 'newest',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 0);
  assert.equal(response.body.meta.totalItems, 0);
});

test('GET /items/:id returns an item', async () => {
  const {item} = await seedProfileAndItem();

  const response = await request(app).get(`/items/${item.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.itemName, 'Desk Lamp');
  assert.equal(response.body._id, item.id);
});

test('GET /items/:id returns 404 for a missing item', async () => {
  const missingId = '507f1f77bcf86cd799439011';

  const response = await request(app).get(`/items/${missingId}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Item not found');
});

test('GET /profile/:profileID returns the profile and its listings', async () => {
  await seedProfileAndItem({
    profile: {
      profileBanner: 'https://example.com/banner.png',
      profileBio: 'UF seller',
      instagramUrl: 'https://instagram.com/seller',
      linkedinUrl: 'https://linkedin.com/in/seller',
      ufVerified: true,
      trustMetrics: {
        reliability: 92,
      },
    },
  });

  const response = await request(app).get('/profile/user_1');

  assert.equal(response.status, 200);
  assert.equal(response.body.profile.profileID, 'user_1');
  assert.equal(response.body.profile.profileBanner, 'https://example.com/banner.png');
  assert.equal(response.body.profile.ufVerified, true);
  assert.equal(response.body.profile.trustMetrics.reliability, 92);
  assert.equal(response.body.listings.length, 1);
  assert.equal(response.body.listings[0].itemName, 'Desk Lamp');
});

test('POST /user upserts richer profile fields without dropping defaults', async () => {
  const response = await request(app)
    .post('/user')
    .send({
      profileID: 'user_9',
      profileName: 'Seller Nine',
      profilePicture: 'https://example.com/seller-nine.png',
      profileBanner: 'https://example.com/banner-nine.png',
      profileBio: 'Selling a few dorm extras.',
      instagramUrl: 'https://instagram.com/sellernine',
      linkedinUrl: 'https://linkedin.com/in/sellernine',
      ufVerified: true,
      trustMetrics: {
        reliability: 91,
        safety: 87,
      },
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.profileName, 'Seller Nine');
  assert.equal(response.body.profileBanner, 'https://example.com/banner-nine.png');
  assert.equal(response.body.profileBio, 'Selling a few dorm extras.');
  assert.equal(response.body.ufVerified, true);
  assert.equal(response.body.trustMetrics.reliability, 91);

  const storedProfile = await Profile.findOne({profileID: 'user_9'});
  assert.deepEqual(storedProfile.profileFavorites, []);
});

test('PATCH /user/:profileID updates editable profile fields', async () => {
  await seedProfileAndItem();

  const response = await request(app)
    .patch('/user/user_1')
    .send({
      profileBanner: 'https://example.com/new-banner.png',
      profileBio: 'Trusted UF marketplace seller.',
      instagramUrl: 'https://instagram.com/newseller',
      linkedinUrl: '',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.profileBanner, 'https://example.com/new-banner.png');
  assert.equal(response.body.profileBio, 'Trusted UF marketplace seller.');
  assert.equal(response.body.instagramUrl, 'https://instagram.com/newseller');
  assert.equal(response.body.linkedinUrl, '');
});

test('POST /create-item persists an explicit category', async () => {
  const response = await request(app)
    .post('/create-item')
    .send({
      itemName: 'Mini Fridge',
      itemCost: '80',
      itemCondition: 'Fair',
      itemLocation: 'Broward Hall',
      itemPicture: 'data:image/png;base64,fridge',
      itemDescription: 'Works well enough',
      itemDetails: 'Needs a wipe-down',
      userPublishingID: 'user_2',
      userPublishingName: 'Seller Two',
      itemCat: 'Home & Garden',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.itemCat, 'Home & Garden');

  const storedItem = await Item.findById(response.body._id);
  assert.equal(storedItem.itemCat, 'Home & Garden');
});

test('POST /create-item derives canonical pickup fields from an approved hub id', async () => {
  const response = await request(app)
    .post('/create-item')
    .send({
      itemName: 'Desk Chair',
      itemCost: '35',
      itemCondition: 'Good',
      pickupHubId: 'library-west',
      itemPicture: 'data:image/png;base64,chair',
      itemDescription: 'Comfortable study chair',
      itemDetails: 'Pickup near the library entrance',
      userPublishingID: 'user_8',
      userPublishingName: 'Seller Eight',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.pickupHubId, 'library-west');
  assert.equal(response.body.pickupArea, 'Historic Core');
  assert.equal(response.body.itemLocation, 'Library West');
  assert.equal(response.body.originalPickupHubId, 'library-west');
  assert.equal(response.body.originalPickupArea, 'Historic Core');
  assert.equal(response.body.originalItemLocation, 'Library West');
});

test('POST /create-item preserves a custom location when the pickup hub id is unknown', async () => {
  const response = await request(app)
    .post('/create-item')
    .send({
      itemName: 'Notebook',
      itemCost: '5',
      itemCondition: 'New',
      pickupHubId: 'midtown',
      itemLocation: 'Midtown Plaza',
      itemPicture: 'data:image/png;base64,notebook',
      itemDescription: 'Unused notebook',
      itemDetails: 'College ruled',
      userPublishingID: 'user_10',
      userPublishingName: 'Seller Ten',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.pickupHubId, null);
  assert.equal(response.body.pickupArea, '');
  assert.equal(response.body.itemLocation, 'Midtown Plaza');
  assert.equal(response.body.originalPickupHubId, null);
  assert.equal(response.body.originalItemLocation, 'Midtown Plaza');
});

test('POST /create-item falls back to the default category when omitted', async () => {
  const response = await request(app)
    .post('/create-item')
    .send({
      itemName: 'Backpack',
      itemCost: '25',
      itemCondition: 'Good',
      itemLocation: 'Reitz Union',
      itemPicture: 'data:image/png;base64,bag',
      itemDescription: 'Used for one semester',
      itemDetails: 'Laptop sleeve inside',
      userPublishingID: 'user_3',
      userPublishingName: 'Seller Three',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.itemCat, 'Miscellaneous');
});

test('OPTIONS /create-item allows loopback browser preflight requests', async () => {
  const response = await request(app)
    .options('/create-item')
    .set('Origin', 'http://127.0.0.1:3000')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:3000');
  assert.match(response.headers['access-control-allow-methods'], /POST/);
  assert.match(response.headers['access-control-allow-headers'], /Content-Type/i);
});

test('DELETE /item/:item deletes an existing item and removes it from favorites', async () => {
  const {item} = await seedProfileAndItem({
    profile: {
      profileFavorites: [],
    },
  });

  await Profile.create({
    profileID: 'user_2',
    profileName: 'Buyer One',
    profilePicture: 'https://example.com/buyer.png',
    profileFavorites: [item.id],
  });

  const response = await request(app).delete(`/item/${item.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Listing deleted');
  assert.equal(await Item.countDocuments({_id: item.id}), 0);

  const favoriteHolder = await Profile.findOne({profileID: 'user_2'});
  assert.deepEqual(favoriteHolder.profileFavorites, []);
});

test('DELETE /item/:item returns 404 when the item does not exist', async () => {
  const missingId = '507f191e810c19729de860ea';

  const response = await request(app).delete(`/item/${missingId}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Not found');
});

test('POST /api/listings/:id/offers creates an offer and linked conversation', async () => {
  const {item, profile} = await seedProfileAndItem();

  const response = await createOffer(item.id);

  assert.equal(response.status, 201);
  assert.equal(response.body.status, 'pending');
  assert.equal(response.body.sellerClerkUserId, profile.profileID);
  assert.ok(response.body.conversationId);

  const storedOffer = await Offer.findById(response.body._id);
  assert.equal(storedOffer.buyerClerkUserId, 'buyer_1');
  assert.equal(storedOffer.paymentMethod, 'cash');

  const linkedConversation = await Conversation.findById(response.body.conversationId);
  assert.deepEqual(linkedConversation.participantIds, ['buyer_1', 'user_1']);
  assert.equal(linkedConversation.activeListingId.toString(), item.id);
  assert.equal(linkedConversation.lastMessageText, 'Buyer One sent an offer.');

  const sentMessage = await Message.findOne({
    conversationId: response.body.conversationId,
    senderClerkUserId: 'system',
  }).sort({createdAt: -1});
  assert.equal(sentMessage.body, 'Buyer One sent an offer.');
  assert.equal(sentMessage.offerSnapshot.eventType, 'sent');
  assert.equal(sentMessage.offerSnapshot.offeredPrice, 18);
  assert.equal(sentMessage.offerSnapshot.paymentMethod, 'cash');
});

test('GET /api/conversations/:id/messages resolves sent-offer titles to the buyer profile name when the snapshot is generic', async () => {
  const {item} = await seedProfileAndItem();
  await Profile.create({
    profileID: 'buyer_1',
    profileName: 'Avery Buyer',
    profilePicture: 'https://example.com/buyer.png',
  });

  const offerResponse = await createOffer(item.id, {
    buyerDisplayName: 'Buyer',
  });

  const response = await request(app)
    .get(`/api/conversations/${offerResponse.body.conversationId}/messages`)
    .query({
      participantId: 'user_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.messages[0].offerContext.title, 'Avery sent an offer');
});

test('POST /api/conversations reuses the same participant thread across different listings', async () => {
  const {profile} = await seedProfileAndItem();
  const secondItem = await Item.create({
    itemName: 'Mini Fridge',
    itemCost: '75',
    itemCondition: 'Fair',
    itemLocation: 'Reitz Union',
    itemPicture: 'data:image/png;base64,def456',
    itemDescription: 'Works well',
    itemDetails: 'A few scratches',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });

  const firstResponse = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: secondItem._id.toString(),
    });

  assert.equal(firstResponse.status, 201);

  const secondResponse = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: secondItem._id.toString(),
    });

  assert.equal(secondResponse.status, 200);
  assert.equal(secondResponse.body._id, firstResponse.body._id);

  const thirdItem = await Item.create({
    itemName: 'Bike Helmet',
    itemCost: '12',
    itemCondition: 'Like New',
    itemLocation: 'Marston Science Library',
    itemPicture: 'data:image/png;base64,ghi789',
    itemDescription: 'Barely used',
    itemDetails: 'Medium size',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });

  const thirdResponse = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: thirdItem._id.toString(),
    });

  assert.equal(thirdResponse.status, 200);
  assert.equal(thirdResponse.body._id, firstResponse.body._id);

  const storedConversation = await Conversation.findById(firstResponse.body._id);
  assert.deepEqual(
    storedConversation.linkedListingIds.map((listingId) => listingId.toString()),
    [secondItem.id, thirdItem.id]
  );
  assert.equal(storedConversation.activeListingId.toString(), thirdItem.id);
  assert.equal(
    await Conversation.countDocuments({
      participantIds: ['buyer_1', profile.profileID].sort(),
    }),
    1
  );
});

test('POST /api/listings/:id/offers reuses an existing participant thread for a new listing', async () => {
  const {item, profile} = await seedProfileAndItem();
  const firstConversationResponse = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: item._id.toString(),
    });
  const secondItem = await Item.create({
    itemName: 'Standing Lamp',
    itemCost: '28',
    itemCondition: 'Good',
    itemLocation: 'Turlington Plaza',
    itemPicture: 'data:image/png;base64,jkl012',
    itemDescription: 'Tall lamp',
    itemDetails: 'Includes shade',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });

  const response = await createOffer(secondItem.id);

  assert.equal(response.status, 201);
  assert.equal(response.body.conversationId, firstConversationResponse.body._id);

  const reusedConversation = await Conversation.findById(response.body.conversationId);
  assert.deepEqual(
    reusedConversation.linkedListingIds.map((listingId) => listingId.toString()),
    [item.id, secondItem.id]
  );
  assert.equal(reusedConversation.activeListingId.toString(), secondItem.id);
  assert.equal(
    await Conversation.countDocuments({
      participantIds: ['buyer_1', profile.profileID].sort(),
    }),
    1
  );
});

test('POST /api/conversations stores linked item metadata for the active listing', async () => {
  const {item, profile} = await seedProfileAndItem();

  const response = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: item._id.toString(),
    });

  assert.equal(response.status, 201);

  const storedConversation = await Conversation.findById(response.body._id);
  assert.equal(storedConversation.linkedItems.length, 1);
  assert.equal(storedConversation.linkedItems[0].listingId.toString(), item.id);
  assert.equal(storedConversation.linkedItems[0].title, item.itemName);
  assert.equal(storedConversation.linkedItems[0].imageUrl, item.itemPicture);
  assert.ok(storedConversation.linkedItems[0].firstLinkedAt);
  assert.ok(storedConversation.linkedItems[0].lastContextAt);
  assert.equal(storedConversation.linkedItems[0].firstContextMessageId, null);
  assert.equal(storedConversation.linkedItems[0].latestContextMessageId, null);
  assert.equal(storedConversation.linkedItems[0].lastKnownStatus, item.status);
});

test('POST /api/conversations/:id/messages stores attached item snapshots and updates linked item metadata', async () => {
  const {item, profile} = await seedProfileAndItem();
  const secondItem = await Item.create({
    itemName: 'Mini Fridge',
    itemCost: '75',
    itemCondition: 'Fair',
    itemLocation: 'Reitz Union',
    itemPicture: 'https://example.com/fridge.png',
    itemDescription: 'Works well',
    itemDetails: 'A few scratches',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });
  const conversationResponse = await request(app)
    .post('/api/conversations')
    .send({
      participantIds: ['buyer_1', profile.profileID],
      activeListingId: item._id.toString(),
    });

  const response = await request(app)
    .post(`/api/conversations/${conversationResponse.body._id}/messages`)
    .send({
      senderClerkUserId: 'buyer_1',
      body: 'Can I bundle this with the fridge too?',
      attachedListingId: secondItem._id.toString(),
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.attachedListingId.toString(), secondItem.id);
  assert.equal(response.body.attachedListingTitle, secondItem.itemName);
  assert.equal(response.body.attachedListingImageUrl, secondItem.itemPicture);
  assert.equal(response.body.attachedItem.listingId.toString(), secondItem.id);
  assert.equal(response.body.attachedItem.title, secondItem.itemName);
  assert.equal(response.body.attachedItem.imageUrl, secondItem.itemPicture);
  assert.equal(response.body.attachedItem.state, 'active');
  assert.equal(response.body.attachedItem.relationshipRole, 'buying');

  const storedConversation = await Conversation.findById(conversationResponse.body._id);
  const fridgeLinkedItem = storedConversation.linkedItems.find(
    (linkedItem) => linkedItem.listingId.toString() === secondItem.id
  );

  assert.ok(fridgeLinkedItem);
  assert.equal(storedConversation.activeListingId.toString(), secondItem.id);
  assert.equal(fridgeLinkedItem.title, secondItem.itemName);
  assert.equal(fridgeLinkedItem.imageUrl, secondItem.itemPicture);
  assert.equal(fridgeLinkedItem.latestContextMessageId.toString(), response.body._id);
  assert.equal(fridgeLinkedItem.lastKnownStatus, secondItem.status);
});

test('GET /api/conversations returns paginated preview context with participant summaries', async () => {
  const {item, profile} = await seedProfileAndItem();
  const secondItem = await Item.create({
    itemName: 'Mini Fridge',
    itemCost: '75',
    itemCondition: 'Fair',
    itemLocation: 'Reitz Union',
    itemPicture: 'https://example.com/fridge.png',
    itemDescription: 'Works well',
    itemDetails: 'A few scratches',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id, secondItem._id],
    activeListingId: secondItem._id,
    lastMessageText: 'Still interested in the fridge.',
    lastMessageAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Still interested in the lamp too.',
    attachedListingId: item._id,
    attachedListingTitle: item.itemName,
    attachedListingImageUrl: item.itemPicture,
    createdAt: new Date('2026-04-01T12:00:00.000Z'),
    updatedAt: new Date('2026-04-01T12:00:00.000Z'),
  });
  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Still interested in the fridge.',
    attachedListingId: secondItem._id,
    attachedListingTitle: secondItem.itemName,
    attachedListingImageUrl: secondItem.itemPicture,
    createdAt: new Date('2026-04-02T15:00:00.000Z'),
    updatedAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  const response = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
      page: 1,
      pageSize: 10,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.totalCount, 1);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.pageSize, 10);
  assert.equal(response.body.totalPages, 1);
  assert.equal(response.body.conversations.length, 1);
  assert.equal(response.body.conversations[0].linkedItemCount, 2);
  assert.equal(response.body.conversations[0].activeItem.listingId.toString(), secondItem.id);
  assert.equal(response.body.conversations[0].activeItem.title, secondItem.itemName);
  assert.equal(response.body.conversations[0].activeItem.state, 'active');
  assert.equal(response.body.conversations[0].activeItem.imageUrl, undefined);
  assert.equal(response.body.conversations[0].linkedItems[0].imageUrl, undefined);
  assert.equal(response.body.conversations[0].otherParticipant.id, profile.profileID);
  assert.equal(response.body.conversations[0].otherParticipant.name, profile.profileName);
  assert.equal(response.body.conversations[0].otherParticipant.avatarUrl, profile.profilePicture);
  assert.equal(response.body.conversations[0].lastMessageSenderClerkUserId, 'buyer_1');
});

test('GET /api/conversations clamps the requested page to the last available page', async () => {
  const { item, profile } = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    activeListingId: item._id,
    lastMessageText: 'Still interested in the lamp.',
    lastMessageAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Still interested in the lamp.',
    attachedListingId: item._id,
    attachedListingTitle: item.itemName,
    attachedListingImageUrl: item.itemPicture,
    createdAt: new Date('2026-04-02T15:00:00.000Z'),
    updatedAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  const response = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
      page: 3,
      pageSize: 5,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.totalPages, 1);
  assert.equal(response.body.conversations.length, 1);
  assert.equal(response.body.conversations[0]._id.toString(), conversation._id.toString());
});

test('GET /api/conversations derives preview items without eagerly repairing legacy threads', async () => {
  const {item, profile} = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    linkedItems: [],
    activeListingId: item._id,
    lastMessageText: 'Still available?',
    lastMessageAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'Still available?',
    attachedListingId: item._id,
    attachedListingTitle: item.itemName,
    attachedListingImageUrl: item.itemPicture,
    createdAt: new Date('2026-04-02T15:00:00.000Z'),
    updatedAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  const response = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
      page: 1,
      pageSize: 10,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversations.length, 1);
  assert.equal(response.body.conversations[0].linkedItemCount, 1);
  assert.equal(response.body.conversations[0].activeItem.title, item.itemName);

  const storedConversation = await Conversation.findById(conversation._id);
  assert.equal(storedConversation.linkedItems.length, 0);
});

test('GET /api/conversations keeps pending preview state for reserved listings', async () => {
  const {item, profile} = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    linkedItems: [],
    activeListingId: item._id,
    lastMessageText: 'Offer is still pending.',
    lastMessageAt: new Date('2026-04-02T16:00:00.000Z'),
  });

  const offer = await Offer.create({
    listingId: item._id,
    buyerClerkUserId: 'buyer_1',
    buyerDisplayName: 'Buyer One',
    sellerClerkUserId: profile.profileID,
    conversationId: conversation._id,
    offeredPrice: 18,
    meetupLocation: 'Plaza of the Americas',
    meetupWindow: 'Tue 1:00 PM - 2:00 PM',
    paymentMethod: 'cash',
    status: 'pending',
  });

  item.status = 'reserved';
  item.reservedOfferId = offer._id;
  await item.save();

  const response = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
      page: 1,
      pageSize: 10,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversations[0].linkedItems[0].state, 'pending');
  assert.equal(response.body.conversations[0].linkedItems[0].currentOffer, undefined);
});

test('opening a thread updates the inbox read timestamp in a JSON-safe shape', async () => {
  const {item, profile} = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    activeListingId: item._id,
    lastMessageText: 'Still available?',
    lastMessageAt: new Date('2026-04-02T15:00:00.000Z'),
    lastReadAtByUser: {
      buyer_1: new Date('2026-04-02T14:00:00.000Z'),
    },
  });

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'Still available?',
    attachedListingId: item._id,
    attachedListingTitle: item.itemName,
    attachedListingImageUrl: item.itemPicture,
    createdAt: new Date('2026-04-02T15:00:00.000Z'),
    updatedAt: new Date('2026-04-02T15:00:00.000Z'),
  });

  const beforeOpenResponse = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(beforeOpenResponse.status, 200);
  assert.equal(beforeOpenResponse.body.conversations[0].lastReadAtByUser.buyer_1, '2026-04-02T14:00:00.000Z');

  const openThreadResponse = await request(app)
    .get(`/api/conversations/${conversation._id}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(openThreadResponse.status, 200);

  const afterOpenResponse = await request(app)
    .get('/api/conversations')
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(afterOpenResponse.status, 200);
  assert.equal(typeof afterOpenResponse.body.conversations[0].lastReadAtByUser, 'object');
  assert.ok(afterOpenResponse.body.conversations[0].lastReadAtByUser.buyer_1);
  assert.notEqual(afterOpenResponse.body.conversations[0].lastReadAtByUser.buyer_1, '2026-04-02T14:00:00.000Z');
});

test('POST /api/listings/:id/offers derives canonical meetup fields from an approved hub id', async () => {
  const {item} = await seedProfileAndItem();

  const response = await createOffer(item.id, {
    meetupHubId: 'plaza-americas',
    meetupLocation: '',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.meetupHubId, 'plaza-americas');
  assert.equal(response.body.meetupArea, 'Historic Core');
  assert.equal(response.body.meetupLocation, 'Plaza of the Americas');
});

test('POST /api/listings/:id/offers preserves a custom meetup location when the hub id is unknown', async () => {
  const {item} = await seedProfileAndItem();

  const response = await createOffer(item.id, {
    meetupHubId: 'sorority-row',
    meetupLocation: 'Sorority Row',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.meetupHubId, null);
  assert.equal(response.body.meetupArea, '');
  assert.equal(response.body.meetupLocation, 'Sorority Row');
});

test('POST /api/listings/:id/offers rejects self-offers', async () => {
  const {item, profile} = await seedProfileAndItem();

  const response = await createOffer(item.id, {
    buyerClerkUserId: profile.profileID,
    buyerDisplayName: profile.profileName,
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'You cannot submit an offer on your own listing');
});

test('GET /api/offers returns offers for both seller and buyer views', async () => {
  const {item, profile} = await seedProfileAndItem();
  await createOffer(item.id);

  const sellerResponse = await request(app)
    .get('/api/offers')
    .query({
      participantId: profile.profileID,
      role: 'seller',
    });
  const buyerResponse = await request(app)
    .get('/api/offers')
    .query({
      participantId: 'buyer_1',
      role: 'buyer',
    });

  assert.equal(sellerResponse.status, 200);
  assert.equal(sellerResponse.body.length, 1);
  assert.equal(sellerResponse.body[0].sellerClerkUserId, profile.profileID);

  assert.equal(buyerResponse.status, 200);
  assert.equal(buyerResponse.body.length, 1);
  assert.equal(buyerResponse.body[0].buyerClerkUserId, 'buyer_1');
});

test('GET /api/offers/:id blocks unrelated users from reading an accepted offer', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Outside Library West by the front benches.',
    });

  const response = await request(app)
    .get(`/api/offers/${offerResponse.body._id}`)
    .query({
      participantId: 'random_user',
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'You are not authorized to view this offer');
});

test('GET /api/offers/:id allows the seller to read an accepted offer', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Outside Library West by the front benches.',
    });

  const response = await request(app)
    .get(`/api/offers/${offerResponse.body._id}`)
    .query({
      participantId: profile.profileID,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body._id, offerResponse.body._id);
});

test('GET /api/offers/:id allows the accepted buyer to read an accepted offer', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Outside Library West by the front benches.',
    });

  const response = await request(app)
    .get(`/api/offers/${offerResponse.body._id}`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body._id, offerResponse.body._id);
});

test('PATCH /api/offers/:id only allows the seller to update a pending offer', async () => {
  const {item} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  const response = await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: 'buyer_1',
      status: 'accepted',
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Only the seller can update this offer');
});

test('PATCH /api/offers/:id requires meetup specifics before accepting an offer', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  const response = await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'pickupSpecifics is required when accepting an offer');

  const updatedItem = await Item.findById(item.id);
  const updatedOffer = await Offer.findById(offerResponse.body._id);
  assert.equal(updatedItem.status, 'active');
  assert.equal(updatedOffer.status, 'pending');
});

test('PATCH /api/offers/:id accepts an offer, reserves the listing, and declines competing offers', async () => {
  const {item, profile} = await seedProfileAndItem();
  const firstOfferResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_1',
    buyerDisplayName: 'Buyer One',
    offeredPrice: 18,
  });
  const secondOfferResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_2',
    buyerDisplayName: 'Buyer Two',
    offeredPrice: 19,
    paymentMethod: 'externalApp',
  });

  const response = await request(app)
    .patch(`/api/offers/${firstOfferResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Outside Library West by the front benches.',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'accepted');

  const updatedItem = await Item.findById(item.id);
  assert.equal(updatedItem.status, 'reserved');
  assert.equal(updatedItem.reservedOfferId.toString(), firstOfferResponse.body._id);
  assert.equal(updatedItem.pickupHubId, 'plaza-americas');
  assert.equal(updatedItem.itemLocation, 'Plaza of the Americas');
  assert.equal(updatedItem.originalPickupHubId, 'library-west');
  assert.equal(updatedItem.originalItemLocation, 'Library West');

  const firstOffer = await Offer.findById(firstOfferResponse.body._id);
  const secondOffer = await Offer.findById(secondOfferResponse.body._id);
  assert.equal(firstOffer.status, 'accepted');
  assert.equal(secondOffer.status, 'declined');

  const acceptedConversation = await Conversation.findById(firstOffer.conversationId);
  assert.equal(acceptedConversation.activePickupHubId, firstOffer.meetupHubId);
  assert.equal(acceptedConversation.activePickupSpecifics, 'Outside Library West by the front benches.');

  const acceptanceMessage = await Message.findOne({
    conversationId: firstOffer.conversationId,
    senderClerkUserId: 'system',
  }).sort({createdAt: -1});
  assert.equal(acceptanceMessage.body, 'Seller accepted your offer.');
  assert.equal(acceptanceMessage.offerSnapshot.eventType, 'accepted');
  assert.equal(acceptanceMessage.offerSnapshot.offeredPrice, 18);
  assert.equal(acceptanceMessage.offerSnapshot.paymentMethod, 'cash');

  const declinedConversation = await Conversation.findById(secondOffer.conversationId);
  const declineMessage = await Message.findOne({
    conversationId: declinedConversation._id,
    senderClerkUserId: 'system',
  }).sort({createdAt: -1});
  assert.equal(declineMessage.body, 'Seller rejected your offer.');
  assert.equal(declineMessage.offerSnapshot.eventType, 'declined');
});

test('GET /api/conversations/:id/messages makes accepted and rejected offer titles viewer-aware', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id, {
    buyerDisplayName: 'Jasmine Patel',
  });

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Meet by the front benches.',
    });

  const sellerViewResponse = await request(app)
    .get(`/api/conversations/${offerResponse.body.conversationId}/messages`)
    .query({
      participantId: profile.profileID,
    });

  const buyerViewResponse = await request(app)
    .get(`/api/conversations/${offerResponse.body.conversationId}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  const acceptedSellerMessage = sellerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'accepted'
  );
  const acceptedBuyerMessage = buyerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'accepted'
  );
  const sentSellerMessage = sellerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'sent'
  );
  const sentBuyerMessage = buyerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'sent'
  );

  assert.equal(sentSellerMessage.offerContext.title, 'Jasmine sent an offer');
  assert.equal(sentBuyerMessage.offerContext.title, 'You sent an offer');
  assert.equal(acceptedSellerMessage.offerContext.title, "You accepted Jasmine's offer");
  assert.equal(acceptedBuyerMessage.offerContext.title, 'Seller accepted your offer');

  const secondItem = await Item.create({
    itemName: 'Mini Fridge',
    itemCost: '50',
    itemCondition: 'Good',
    itemLocation: 'Reitz Union',
    itemPicture: 'https://example.com/fridge.png',
    itemDescription: 'Still cold',
    itemDetails: 'Works well',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });
  const declinedOfferResponse = await createOffer(secondItem.id, {
    buyerClerkUserId: 'buyer_2',
    buyerDisplayName: 'Mateo Cruz',
  });

  await Profile.create({
    profileID: 'buyer_2',
    profileName: 'Mateo Cruz',
    profilePicture: 'https://example.com/buyer-two.png',
  });

  await request(app)
    .patch(`/api/offers/${declinedOfferResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'declined',
    });

  const rejectedSellerViewResponse = await request(app)
    .get(`/api/conversations/${declinedOfferResponse.body.conversationId}/messages`)
    .query({
      participantId: profile.profileID,
    });

  const rejectedBuyerViewResponse = await request(app)
    .get(`/api/conversations/${declinedOfferResponse.body.conversationId}/messages`)
    .query({
      participantId: 'buyer_2',
    });

  const rejectedSellerMessage = rejectedSellerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'declined'
  );
  const rejectedBuyerMessage = rejectedBuyerViewResponse.body.messages.find(
    (message) => message.offerContext?.eventType === 'declined'
  );

  assert.equal(rejectedSellerMessage.offerContext.title, "You rejected Mateo's offer");
  assert.equal(rejectedBuyerMessage.offerContext.title, 'Seller rejected your offer');
});

test('PATCH /api/offers/:id decline adds a brief rejection message to the thread', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  const response = await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'declined',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'declined');

  const declineMessage = await Message.findOne({
    conversationId: response.body.conversationId,
    senderClerkUserId: 'system',
  }).sort({createdAt: -1});
  assert.equal(declineMessage.body, 'Seller rejected your offer.');
  assert.equal(declineMessage.offerSnapshot.eventType, 'declined');
});

test('PATCH /api/conversations/:id/pickup lets the seller update meetup specifics while keeping the accepted hub locked', async () => {
  const {item} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_1',
    meetupHubId: 'reitz',
    meetupLocation: '',
  });

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: 'user_1',
      status: 'accepted',
      pickupSpecifics: 'Meet outside the food court doors.',
    });

  const response = await request(app)
    .patch(`/api/conversations/${offerResponse.body.conversationId}/pickup`)
    .send({
      requesterClerkUserId: 'user_1',
      pickupHubId: 'reitz',
      pickupSpecifics: 'Meet near the main benches.',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.activePickupHubId, 'reitz');
  assert.equal(response.body.conversation.activePickupSpecifics, 'Meet near the main benches.');
  assert.equal(response.body.systemMessage.senderClerkUserId, 'system');
  assert.match(response.body.systemMessage.body, /Meetup details updated to Reitz Union/);
  assert.equal(response.body.systemMessage.attachedItem.listingId.toString(), item.id);
  assert.equal(response.body.systemMessage.attachedItem.title, item.itemName);

  const updatedConversation = await Conversation.findById(offerResponse.body.conversationId);
  assert.equal(updatedConversation.activePickupHubId, 'reitz');
  assert.equal(updatedConversation.activePickupSpecifics, 'Meet near the main benches.');

  const updatedListing = await Item.findById(item.id);
  assert.equal(updatedListing.pickupHubId, 'reitz');
  assert.equal(updatedListing.itemLocation, 'Reitz Union');
  assert.equal(updatedListing.originalPickupHubId, 'library-west');
  assert.equal(updatedListing.originalItemLocation, 'Library West');
});

test('PATCH /api/conversations/:id/pickup rejects meetup hub changes after acceptance', async () => {
  const {item} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_1',
    meetupHubId: 'reitz',
    meetupLocation: '',
  });

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: 'user_1',
      status: 'accepted',
      pickupSpecifics: 'Meet outside the food court doors.',
    });

  const response = await request(app)
    .patch(`/api/conversations/${offerResponse.body.conversationId}/pickup`)
    .send({
      requesterClerkUserId: 'user_1',
      pickupHubId: 'plaza-americas',
      pickupSpecifics: 'Meet near the main benches.',
    });

  assert.equal(response.status, 409);
  assert.equal(
    response.body.message,
    'The meetup hub is locked after acceptance. You can still update meetup specifics.'
  );
});

test('PATCH /api/conversations/:id/pickup on a non-reserved conversation does not overwrite the listing actual pickup state', async () => {
  const {item} = await seedProfileAndItem();
  const acceptedOfferResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_1',
    meetupHubId: 'reitz',
    meetupLocation: '',
  });
  const declinedOfferResponse = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_2',
    buyerDisplayName: 'Buyer Two',
    meetupHubId: 'plaza-americas',
    meetupLocation: '',
    paymentMethod: 'externalApp',
  });

  await request(app)
    .patch(`/api/offers/${acceptedOfferResponse.body._id}`)
    .send({
      requesterClerkUserId: 'user_1',
      status: 'accepted',
      pickupSpecifics: 'Meet outside the food court doors.',
    });

  const response = await request(app)
    .patch(`/api/conversations/${declinedOfferResponse.body.conversationId}/pickup`)
    .send({
      requesterClerkUserId: 'user_1',
      pickupHubId: 'plaza-americas',
      pickupSpecifics: 'I can still meet here if the accepted buyer falls through.',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.activePickupHubId, 'plaza-americas');

  const updatedListing = await Item.findById(item.id);
  assert.equal(updatedListing.pickupHubId, 'reitz');
  assert.equal(updatedListing.itemLocation, 'Reitz Union');
  assert.equal(updatedListing.originalPickupHubId, 'library-west');
  assert.equal(updatedListing.originalItemLocation, 'Library West');
});

test('PATCH /api/conversations/:id/pickup requires seller-authored meetup specifics updates', async () => {
  const {item} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: 'user_1',
      status: 'accepted',
      pickupSpecifics: 'Meet at the main entrance.',
    });

  const response = await request(app)
    .patch(`/api/conversations/${offerResponse.body.conversationId}/pickup`)
    .send({
      requesterClerkUserId: 'buyer_1',
      pickupHubId: 'reitz',
      pickupSpecifics: 'Near the front doors.',
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Only the seller can update meetup details');
});

test('PATCH /api/conversations/:id/pickup requires meetup specifics text', async () => {
  const {item} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: 'user_1',
      status: 'accepted',
      pickupSpecifics: 'Meet at the main entrance.',
    });

  const response = await request(app)
    .patch(`/api/conversations/${offerResponse.body.conversationId}/pickup`)
    .send({
      requesterClerkUserId: 'user_1',
      pickupHubId: 'reitz',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'pickupSpecifics is required');
});

test('GET /api/conversations/:id/messages repairs a legacy accepted conversation pickup hub from the reserved offer', async () => {
  const {item, profile} = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    activeListingId: item._id,
    activePickupHubId: null,
    activePickupSpecifics: 'By the tables outside',
  });
  const legacyOffer = await Offer.create({
    listingId: item._id,
    buyerClerkUserId: 'buyer_1',
    buyerDisplayName: 'Buyer One',
    sellerClerkUserId: profile.profileID,
    conversationId: conversation._id,
    offeredPrice: 18,
    meetupHubId: null,
    meetupArea: '',
    meetupLocation: 'Marston Science Library',
    meetupWindow: 'Tomorrow at noon',
    paymentMethod: 'cash',
    message: 'Can we do Marston?',
    status: 'accepted',
  });

  item.status = 'reserved';
  item.reservedOfferId = legacyOffer._id;
  item.pickupHubId = 'marston';
  item.pickupArea = 'East Core';
  item.itemLocation = 'Marston Science Library';
  item.originalPickupHubId = 'library-west';
  item.originalPickupArea = 'Historic Core';
  item.originalItemLocation = 'Library West';
  await item.save();

  const response = await request(app)
    .get(`/api/conversations/${conversation._id}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.activePickupHubId, 'marston');

  const repairedConversation = await Conversation.findById(conversation._id);
  assert.equal(repairedConversation.activePickupHubId, 'marston');
});

test('GET /api/conversations/:id/messages returns sorted linked items, active item context, and derived states', async () => {
  const {profile} = await seedProfileAndItem();
  const activeItem = await Item.create({
    itemName: 'Desk Lamp',
    itemCost: '20',
    itemCondition: 'Good',
    itemLocation: 'Library West',
    itemPicture: 'https://example.com/lamp.png',
    itemDescription: 'Lamp for studying',
    itemDetails: 'Warm bulb included',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    status: 'active',
  });
  const pendingItem = await Item.create({
    itemName: 'Mini Fridge',
    itemCost: '70',
    itemCondition: 'Fair',
    itemLocation: 'Reitz Union',
    itemPicture: 'https://example.com/fridge.png',
    itemDescription: 'Cold and reliable',
    itemDetails: 'A little loud',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    status: 'reserved',
  });
  const completedItem = await Item.create({
    itemName: 'Bike Helmet',
    itemCost: '15',
    itemCondition: 'Like New',
    itemLocation: 'Marston Science Library',
    itemPicture: 'https://example.com/helmet.png',
    itemDescription: 'Helmet',
    itemDetails: 'Medium size',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    status: 'sold',
  });
  const archivedItem = await Item.create({
    itemName: 'Poster Tube',
    itemCost: '5',
    itemCondition: 'Used',
    itemLocation: 'Turlington Plaza',
    itemPicture: 'https://example.com/tube.png',
    itemDescription: 'Tube',
    itemDetails: 'Still works',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    status: 'archived',
  });
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [activeItem._id, pendingItem._id, completedItem._id, archivedItem._id],
    activeListingId: activeItem._id,
    lastMessageText: 'Latest thread update',
    lastMessageAt: new Date('2026-04-04T14:00:00.000Z'),
  });
  const pendingOffer = await Offer.create({
    listingId: pendingItem._id,
    buyerClerkUserId: 'buyer_1',
    buyerDisplayName: 'Buyer One',
    sellerClerkUserId: profile.profileID,
    conversationId: conversation._id,
    offeredPrice: 68,
    meetupHubId: 'reitz',
    meetupArea: 'South Core',
    meetupLocation: 'Reitz Union',
    meetupWindow: 'Tomorrow afternoon',
    paymentMethod: 'cash',
    message: 'Could meet tomorrow.',
    status: 'accepted',
  });
  pendingItem.reservedOfferId = pendingOffer._id;
  await pendingItem.save();

  const completedOffer = await Offer.create({
    listingId: completedItem._id,
    buyerClerkUserId: 'buyer_1',
    buyerDisplayName: 'Buyer One',
    sellerClerkUserId: profile.profileID,
    conversationId: conversation._id,
    offeredPrice: 15,
    meetupHubId: 'marston',
    meetupArea: 'East Core',
    meetupLocation: 'Marston Science Library',
    meetupWindow: 'Today',
    paymentMethod: 'cash',
    message: 'Ready to buy.',
    status: 'accepted',
  });
  completedItem.reservedOfferId = completedOffer._id;
  await completedItem.save();

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Checking on the lamp.',
    attachedListingId: activeItem._id,
    attachedListingTitle: activeItem.itemName,
    attachedListingImageUrl: activeItem.itemPicture,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  });
  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'The fridge is reserved for you.',
    attachedListingId: pendingItem._id,
    attachedListingTitle: pendingItem.itemName,
    attachedListingImageUrl: pendingItem.itemPicture,
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
    updatedAt: new Date('2026-04-02T10:00:00.000Z'),
  });
  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'system',
    body: 'Helmet sale completed.',
    attachedListingId: completedItem._id,
    attachedListingTitle: completedItem.itemName,
    attachedListingImageUrl: completedItem.itemPicture,
    createdAt: new Date('2026-04-03T10:00:00.000Z'),
    updatedAt: new Date('2026-04-03T10:00:00.000Z'),
  });
  const archivedMessage = await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'The poster tube is no longer available.',
    attachedListingId: archivedItem._id,
    attachedListingTitle: archivedItem.itemName,
    attachedListingImageUrl: archivedItem.itemPicture,
    createdAt: new Date('2026-04-04T10:00:00.000Z'),
    updatedAt: new Date('2026-04-04T10:00:00.000Z'),
  });

  const response = await request(app)
    .get(`/api/conversations/${conversation._id}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.linkedItemCount, 4);
  assert.equal(response.body.conversation.activeItem.listingId.toString(), activeItem.id);
  assert.equal(response.body.conversation.activeItem.state, 'active');
  assert.deepEqual(
    response.body.conversation.linkedItems.map((linkedItem) => linkedItem.listingId.toString()),
    [archivedItem.id, completedItem.id, pendingItem.id, activeItem.id]
  );
  assert.deepEqual(
    response.body.conversation.linkedItems.map((linkedItem) => linkedItem.state),
    ['unavailable', 'completedHere', 'pending', 'active']
  );
  assert.equal(response.body.conversation.linkedItems[2].currentOffer.title, 'Offer accepted');
  assert.equal(
    response.body.conversation.linkedItems[2].currentOffer.detailLine,
    '$68 • Cash • Reitz Union'
  );
  assert.equal(response.body.messages[3].attachedItem.listingId.toString(), archivedItem.id);
  assert.equal(response.body.messages[3].attachedItem.title, archivedItem.itemName);
  assert.equal(response.body.messages[3].attachedItem.state, 'unavailable');
  assert.equal(response.body.messages[3].attachedItem.lastKnownStatus, archivedItem.status);
  assert.equal(response.body.conversation.activeItem.relationshipRole, 'buying');
  assert.equal(response.body.conversation.linkedItems[0].latestContextMessageId.toString(), archivedMessage.id);
});

test('GET /api/conversations/:id/messages derives buying and selling roles for mixed-direction threads', async () => {
  const {profile} = await seedProfileAndItem();
  const buyingItem = await Item.create({
    itemName: 'Desk Lamp',
    itemCost: '20',
    itemCondition: 'Good',
    itemLocation: 'Library West',
    itemPicture: 'https://example.com/lamp.png',
    itemDescription: 'Lamp for studying',
    itemDetails: 'Warm bulb included',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
    status: 'active',
  });
  const sellingItem = await Item.create({
    itemName: 'Study Chair',
    itemCost: '35',
    itemCondition: 'Good',
    itemLocation: 'Reitz Union',
    itemPicture: 'https://example.com/chair.png',
    itemDescription: 'Desk chair',
    itemDetails: 'Comfortable',
    userPublishingID: 'buyer_1',
    userPublishingName: 'Buyer One',
    status: 'active',
  });
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [buyingItem._id, sellingItem._id],
    activeListingId: sellingItem._id,
    lastMessageText: 'Let us trade both items.',
    lastMessageAt: new Date('2026-04-04T14:00:00.000Z'),
  });

  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'I still want the lamp.',
    attachedListingId: buyingItem._id,
    attachedListingTitle: buyingItem.itemName,
    attachedListingImageUrl: buyingItem.itemPicture,
    createdAt: new Date('2026-04-03T10:00:00.000Z'),
    updatedAt: new Date('2026-04-03T10:00:00.000Z'),
  });
  await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'I can also pick up your chair.',
    attachedListingId: sellingItem._id,
    attachedListingTitle: sellingItem.itemName,
    attachedListingImageUrl: sellingItem.itemPicture,
    createdAt: new Date('2026-04-04T10:00:00.000Z'),
    updatedAt: new Date('2026-04-04T10:00:00.000Z'),
  });

  const response = await request(app)
    .get(`/api/conversations/${conversation._id}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.activeItem.relationshipRole, 'selling');
  assert.deepEqual(
    response.body.conversation.linkedItems.map((linkedItem) => linkedItem.relationshipRole),
    ['selling', 'buying']
  );
  assert.equal(response.body.messages[0].attachedItem.relationshipRole, 'buying');
  assert.equal(response.body.messages[1].attachedItem.relationshipRole, 'selling');
});

test('POST /api/conversations/:id/messages lazily repairs linked item history for a legacy conversation on write', async () => {
  const {item, profile} = await seedProfileAndItem();
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id],
    activeListingId: item._id,
  });
  const taggedMessage = await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Still interested in the lamp.',
    attachedListingId: item._id,
    attachedListingTitle: 'Desk Lamp',
    attachedListingImageUrl: 'https://example.com/lamp-snapshot.png',
  });

  const response = await request(app)
    .post(`/api/conversations/${conversation._id}/messages`)
    .send({
      senderClerkUserId: 'buyer_1',
      body: 'Following up in the same thread.',
    });

  assert.equal(response.status, 201);

  const repairedConversation = await Conversation.findById(conversation._id);
  assert.equal(repairedConversation.linkedItems.length, 1);
  assert.equal(repairedConversation.linkedItems[0].listingId.toString(), item.id);
  assert.equal(repairedConversation.linkedItems[0].firstContextMessageId.toString(), taggedMessage.id);
  assert.equal(repairedConversation.linkedItems[0].latestContextMessageId.toString(), taggedMessage.id);
  assert.equal(repairedConversation.linkedItems[0].title, item.itemName);
});

test('GET /api/conversations/:id/messages repairs legacy linked items from live listings and message snapshots', async () => {
  const {item, profile} = await seedProfileAndItem();
  const deletedItem = await Item.create({
    itemName: 'Old Backpack',
    itemCost: '10',
    itemCondition: 'Used',
    itemLocation: 'Marston Science Library',
    itemPicture: 'https://example.com/backpack.png',
    itemDescription: 'Still usable',
    itemDetails: 'One zipper sticks',
    userPublishingID: profile.profileID,
    userPublishingName: profile.profileName,
  });
  const conversation = await Conversation.create({
    participantIds: ['buyer_1', profile.profileID],
    linkedListingIds: [item._id, deletedItem._id],
    activeListingId: item._id,
  });
  const deletedItemMessage = await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: 'buyer_1',
    body: 'Is the backpack still around?',
    attachedListingId: deletedItem._id,
    attachedListingTitle: 'Old Backpack Snapshot',
    attachedListingImageUrl: 'https://example.com/backpack-snapshot.png',
  });
  const liveItemMessage = await Message.create({
    conversationId: conversation._id,
    senderClerkUserId: profile.profileID,
    body: 'The lamp is still available.',
    attachedListingId: item._id,
    attachedListingTitle: '',
    attachedListingImageUrl: '',
  });

  await Item.deleteOne({_id: deletedItem._id});

  const response = await request(app)
    .get(`/api/conversations/${conversation._id}/messages`)
    .query({
      participantId: 'buyer_1',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.conversation.linkedItems.length, 2);

  const repairedDeletedLinkedItem = response.body.conversation.linkedItems.find(
    (linkedItem) => linkedItem.listingId.toString() === deletedItem.id
  );
  const repairedLiveLinkedItem = response.body.conversation.linkedItems.find(
    (linkedItem) => linkedItem.listingId.toString() === item.id
  );

  assert.ok(repairedDeletedLinkedItem);
  assert.equal(repairedDeletedLinkedItem.title, 'Old Backpack Snapshot');
  assert.equal(repairedDeletedLinkedItem.imageUrl, 'https://example.com/backpack-snapshot.png');
  assert.equal(repairedDeletedLinkedItem.firstContextMessageId.toString(), deletedItemMessage.id);
  assert.equal(repairedDeletedLinkedItem.latestContextMessageId.toString(), deletedItemMessage.id);
  assert.equal(repairedDeletedLinkedItem.lastKnownStatus, 'deleted');
  assert.equal(repairedDeletedLinkedItem.state, 'unavailable');

  assert.ok(repairedLiveLinkedItem);
  assert.equal(repairedLiveLinkedItem.title, item.itemName);
  assert.equal(repairedLiveLinkedItem.latestContextMessageId.toString(), liveItemMessage.id);
  assert.equal(response.body.conversation.linkedItemCount, 2);
  assert.equal(response.body.conversation.activeItem.listingId.toString(), item.id);
  assert.equal(response.body.messages[0].attachedItem.title, 'Old Backpack Snapshot');
  assert.equal(response.body.messages[0].attachedItem.imageUrl, 'https://example.com/backpack-snapshot.png');
  assert.equal(response.body.messages[0].attachedItem.state, 'unavailable');
  assert.equal(response.body.messages[1].attachedItem.title, item.itemName);
  assert.equal(response.body.messages[1].attachedItem.state, 'active');

  const storedConversation = await Conversation.findById(conversation._id);
  const storedDeletedLinkedItem = storedConversation.linkedItems.find(
    (linkedItem) => linkedItem.listingId.toString() === deletedItem.id
  );
  assert.ok(storedDeletedLinkedItem);
  assert.equal(storedDeletedLinkedItem.title, 'Old Backpack Snapshot');
});

test('POST /api/listings/:id/offers rejects new offers once a listing is reserved', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
      pickupSpecifics: 'Meet outside the main doors.',
    });

  const response = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_2',
    buyerDisplayName: 'Buyer Two',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'This listing is no longer accepting offers');
});
