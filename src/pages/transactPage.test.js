import { render, screen } from '@testing-library/react';
import { TransactPage } from './transactPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockGetTransactionByOfferId = jest.fn();
const mockNavigate = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));
let mockCurrentParams = { orderId: 'offer-1' };

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/transactionsApi', () => ({
  getTransactionByOfferId: (...args) => mockGetTransactionByOfferId(...args),
}));

jest.mock('../components/ui', () => {
  const actual = jest.requireActual('../components/ui');

  return {
    ...actual,
    useConfirmDialog: () => ({
      confirm: mockConfirm,
    }),
  };
});

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
      useParams: () => mockCurrentParams,
      useNavigate: () => mockNavigate,
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
    ...overrides,
  };
}

beforeEach(() => {
  resetClerkState();
  mockCurrentParams = { orderId: 'offer-1' };
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });
  mockGetTransactionByOfferId.mockReset();
  mockNavigate.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
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
          profilePicture: 'https://example.com/seller.png',
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

test('transaction page shows the buyer confirmation label', async () => {
  render(<TransactPage />);

  expect(await screen.findByRole('button', { name: /i received the item/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /there was a problem/i })).toBeInTheDocument();
});

test('transaction page shows the seller confirmation label', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });
  mockGetTransactionByOfferId.mockResolvedValueOnce(buildRawTransaction());

  render(<TransactPage />);

  expect(await screen.findByRole('button', { name: /i handed off the item/i })).toBeInTheDocument();
});

test('transaction page renders accepted payment details, pickup specifics, and conversation link', async () => {
  render(<TransactPage />);

  expect(await screen.findByText('Cash')).toBeInTheDocument();
  expect(screen.getByText('Reitz Union')).toBeInTheDocument();
  expect(screen.getByText('In front of the bookstore entrance.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open conversation/i })).toHaveAttribute(
    'href',
    '/messages/conversation-1'
  );
});

test.each([
  ['scheduled', 'Scheduled for handoff'],
  ['buyerConfirmed', 'Waiting for seller confirmation'],
  ['sellerConfirmed', 'Waiting for buyer confirmation'],
  ['completed', 'Both sides confirmed'],
  ['problemReported', 'Problem reported'],
])('transaction page shows the correct state banner for %s', async (status, bannerText) => {
  mockGetTransactionByOfferId.mockResolvedValueOnce(buildRawTransaction({ status }));

  render(<TransactPage />);

  expect(await screen.findByText(bannerText)).toBeInTheDocument();
});
