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
    Item,
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
  await seedProfileAndItem();

  const response = await request(app).get('/profile/user_1');

  assert.equal(response.status, 200);
  assert.equal(response.body.profile.profileID, 'user_1');
  assert.equal(response.body.listings.length, 1);
  assert.equal(response.body.listings[0].itemName, 'Desk Lamp');
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
