import {createOffer, getIndividualOffer, getOffers, updateOfferStatus} from './offersApi';

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

test('createOffer posts the structured offer payload to the offers endpoint', async () => {
  global.fetch.mockImplementation(() => jsonResponse({_id: 'offer-1'}));

  const payload = {
    buyerClerkUserId: 'buyer-1',
    offeredPrice: 25,
  };

  const result = await createOffer('item-1', payload);

  expect(result).toEqual({_id: 'offer-1'});
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/listings/item-1/offers',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
});

test('getOffers requests offers using the buyer or seller query parameters', async () => {
  global.fetch.mockImplementation(() => jsonResponse([]));

  await getOffers({
    participantId: 'seller-1',
    role: 'seller',
  });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/offers?participantId=seller-1&role=seller',
    undefined
  );
});

test('getIndividualOffer includes the participant query parameter for protected reads', async () => {
  global.fetch.mockImplementation(() => jsonResponse({_id: 'offer-1'}));

  await getIndividualOffer('offer-1', {
    participantId: 'seller-1',
  });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/offers/offer-1?participantId=seller-1',
    undefined
  );
});

test('updateOfferStatus surfaces backend errors', async () => {
  global.fetch.mockImplementation(() => jsonResponse({message: 'Only the seller can update this offer'}, 403));

  await expect(
    updateOfferStatus('offer-1', {
      requesterClerkUserId: 'buyer-1',
      status: 'accepted',
    })
  ).rejects.toThrow('Only the seller can update this offer');
});
