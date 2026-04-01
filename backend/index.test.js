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
  assert.equal(response.body.meta.totalItems, 1);
  assert.equal(response.body.meta.page, 1);
  assert.equal(response.body.meta.totalPages, 1);
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
  assert.equal(response.body.pickupArea, 'Central Campus');
  assert.equal(response.body.itemLocation, 'Library West');
});

test('POST /create-item rejects unknown pickup hub ids', async () => {
  const response = await request(app)
    .post('/create-item')
    .send({
      itemName: 'Notebook',
      itemCost: '5',
      itemCondition: 'New',
      pickupHubId: 'midtown',
      itemPicture: 'data:image/png;base64,notebook',
      itemDescription: 'Unused notebook',
      itemDetails: 'College ruled',
      userPublishingID: 'user_10',
      userPublishingName: 'Seller Ten',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'pickupHubId must be one of the approved pickup hubs');
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
});

test('POST /api/listings/:id/offers derives canonical meetup fields from an approved hub id', async () => {
  const {item} = await seedProfileAndItem();

  const response = await createOffer(item.id, {
    meetupHubId: 'plaza-americas',
    meetupLocation: '',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.meetupHubId, 'plaza-americas');
  assert.equal(response.body.meetupArea, 'Central Campus');
  assert.equal(response.body.meetupLocation, 'Plaza of the Americas');
});

test('POST /api/listings/:id/offers rejects unknown meetup hub ids', async () => {
  const {item} = await seedProfileAndItem();

  const response = await createOffer(item.id, {
    meetupHubId: 'sorority-row',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'meetupHubId must be one of the approved pickup hubs');
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
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'accepted');

  const updatedItem = await Item.findById(item.id);
  assert.equal(updatedItem.status, 'reserved');
  assert.equal(updatedItem.reservedOfferId.toString(), firstOfferResponse.body._id);

  const firstOffer = await Offer.findById(firstOfferResponse.body._id);
  const secondOffer = await Offer.findById(secondOfferResponse.body._id);
  assert.equal(firstOffer.status, 'accepted');
  assert.equal(secondOffer.status, 'declined');
});

test('POST /api/listings/:id/offers rejects new offers once a listing is reserved', async () => {
  const {item, profile} = await seedProfileAndItem();
  const offerResponse = await createOffer(item.id);

  await request(app)
    .patch(`/api/offers/${offerResponse.body._id}`)
    .send({
      requesterClerkUserId: profile.profileID,
      status: 'accepted',
    });

  const response = await createOffer(item.id, {
    buyerClerkUserId: 'buyer_2',
    buyerDisplayName: 'Buyer Two',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'This listing is no longer accepting offers');
});
