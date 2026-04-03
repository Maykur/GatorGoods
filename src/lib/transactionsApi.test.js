import {getTransactionByOfferId, submitTransactionDecision} from './transactionsApi';

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

test('getTransactionByOfferId includes the participant query parameter', async () => {
  global.fetch.mockImplementation(() => jsonResponse({_id: 'transaction-1'}));

  await getTransactionByOfferId('offer-1', {
    participantId: 'seller-1',
  });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/transactions/by-offer/offer-1?participantId=seller-1',
    undefined
  );
});

test('submitTransactionDecision sends the latest participant decision', async () => {
  global.fetch.mockImplementation(() => jsonResponse({_id: 'transaction-1', status: 'completed'}));

  const payload = {
    requesterClerkUserId: 'buyer-1',
    decision: 'confirmed',
  };

  await submitTransactionDecision('transaction-1', payload);

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/transactions/transaction-1/decision',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  );
});
