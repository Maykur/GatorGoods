import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionReviewPage } from './TransactionReviewPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockGetTransactionByOfferId = jest.fn();
const mockSubmitTransactionReview = jest.fn();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
let mockCurrentParams = { orderId: 'offer-1' };

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/transactionsApi', () => ({
  getTransactionByOfferId: (...args) => mockGetTransactionByOfferId(...args),
  submitTransactionReview: (...args) => mockSubmitTransactionReview(...args),
}));

jest.mock('../components/ui', () => {
  const actual = jest.requireActual('../components/ui');

  return {
    ...actual,
    useToast: () => ({
      showToast: mockShowToast,
    }),
  };
});

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
      useNavigate: () => mockNavigate,
      useParams: () => mockCurrentParams,
    };
  },
  { virtual: true }
);

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function buildRawTransaction(overrides = {}) {
  return {
    _id: 'transaction-1',
    offerId: 'offer-1',
    listingId: 'item-1',
    conversationId: 'conversation-1',
    buyerClerkUserId: 'buyer-1',
    sellerClerkUserId: 'seller-1',
    acceptedTerms: {
      price: 64.98,
      paymentMethod: 'cash',
      meetupHubId: 'reitz',
      meetupLocation: 'Reitz Union',
      pickupSpecifics: 'In front of the bookstore entrance.',
      meetupDate: '2026-04-03',
      meetupTime: '16:00',
    },
    status: 'scheduled',
    buyerDecision: '',
    sellerDecision: '',
    buyerReviewedAt: null,
    sellerReviewedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  resetClerkState();
  window.history.pushState({}, '', '/transact/offer-1/review?decision=confirmed');
  mockCurrentParams = { orderId: 'offer-1' };
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });
  mockGetTransactionByOfferId.mockReset();
  mockSubmitTransactionReview.mockReset();
  mockNavigate.mockReset();
  mockShowToast.mockReset();
  mockGetTransactionByOfferId.mockResolvedValue(buildRawTransaction());

  global.fetch = jest.fn((url) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse({
        _id: 'item-1',
        itemName: 'Mini Fridge',
        itemCost: '80',
        itemCondition: 'Good',
        itemLocation: 'Library West',
        originalPickupHubId: 'library-west',
        originalItemLocation: 'Library West',
        status: 'reserved',
        itemPictureUrl: '/items/item-1/image',
        userPublishingName: 'Seller One',
      });
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileName: 'Seller One',
        },
      });
    }

    if (url === 'http://localhost:5000/profile/buyer-1') {
      return jsonResponse({
        profile: {
          profileName: 'Buyer One',
        },
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
});

afterEach(() => {
  delete global.fetch;
});

test('transaction review page blocks unauthorized access with an error banner', async () => {
  mockGetTransactionByOfferId.mockRejectedValueOnce(new Error('You are not authorized to view this transaction'));

  render(<TransactionReviewPage />);

  expect(await screen.findByText(/you are not authorized to view this transaction/i)).toBeInTheDocument();
});

test('wrong-button path returns to the transaction view without saving', async () => {
  render(<TransactionReviewPage />);

  expect(await screen.findByRole('link', { name: /i clicked the wrong button/i })).toHaveAttribute(
    'href',
    '/transact/offer-1'
  );
  expect(mockSubmitTransactionReview).not.toHaveBeenCalled();
});

test('buyer review submission includes accuracy in the questionnaire payload', async () => {
  mockSubmitTransactionReview.mockResolvedValue({});

  render(<TransactionReviewPage />);

  fireEvent.click(await screen.findByRole('button', { name: /reliability score 5/i }));
  fireEvent.click(screen.getByRole('button', { name: /listing accuracy score 4/i }));
  fireEvent.click(screen.getByRole('button', { name: /responsiveness score 5/i }));
  fireEvent.click(screen.getByRole('button', { name: /safety score 5/i }));
  fireEvent.change(screen.getByLabelText(/anything else to share/i), {
    target: { value: 'Everything matched the listing.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit transaction review/i }));

  await waitFor(() => {
    expect(mockSubmitTransactionReview).toHaveBeenCalledWith(
      'transaction-1',
      expect.objectContaining({
        decision: 'confirmed',
        answers: expect.objectContaining({
          accuracy: 4,
        }),
      })
    );
  });
});

test('seller review submission omits accuracy from the questionnaire payload', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });
  mockGetTransactionByOfferId.mockResolvedValueOnce(buildRawTransaction());
  mockSubmitTransactionReview.mockResolvedValue({});

  render(<TransactionReviewPage />);

  fireEvent.click(await screen.findByRole('button', { name: /reliability score 5/i }));
  fireEvent.click(screen.getByRole('button', { name: /responsiveness score 4/i }));
  fireEvent.click(screen.getByRole('button', { name: /safety score 5/i }));
  fireEvent.change(screen.getByLabelText(/anything else to share/i), {
    target: { value: 'Smooth handoff.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit transaction review/i }));

  await waitFor(() => {
    expect(mockSubmitTransactionReview).toHaveBeenCalledWith(
      'transaction-1',
      expect.objectContaining({
        decision: 'confirmed',
        answers: expect.not.objectContaining({
          accuracy: expect.anything(),
        }),
      })
    );
  });
  expect(screen.queryByLabelText(/listing accuracy/i)).not.toBeInTheDocument();
});
