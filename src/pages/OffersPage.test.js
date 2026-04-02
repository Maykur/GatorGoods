import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OffersPage } from './OffersPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockGetOffers = jest.fn();
const mockUpdateOfferStatus = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@clerk/react', () => {
  const React = require('react');
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/offersApi', () => ({
  getOffers: (...args) => mockGetOffers(...args),
  updateOfferStatus: (...args) => mockUpdateOfferStatus(...args),
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

beforeEach(() => {
  resetClerkState();
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });
  global.fetch = jest.fn((url) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse({
        _id: 'item-1',
        itemName: 'Desk Lamp',
        status: 'active',
        userPublishingName: 'Seller One',
      });
    }

    if (url === 'http://localhost:5000/profile/buyer-1') {
      return jsonResponse({
        profile: {
          profileName: 'Buyer One',
          profileRating: 4.2,
          trustMetrics: {
            reliability: 84,
            accuracy: 91,
            responsiveness: 77,
            safety: 95,
          },
        },
      });
    }

    if (url === 'http://localhost:5000/profile/buyer-2') {
      return jsonResponse({
        profile: {
          profileName: 'Buyer Two',
          profileRating: 4.8,
          trustMetrics: {
            reliability: 93,
            accuracy: 90,
            responsiveness: 98,
            safety: 88,
          },
        },
      });
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileName: 'Seller One',
          profileRating: 4.6,
          trustMetrics: {
            reliability: 92,
            accuracy: 88,
            responsiveness: 100,
            safety: 81,
          },
        },
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
  mockGetOffers.mockReset();
  mockUpdateOfferStatus.mockReset();
  mockShowToast.mockReset();
});

afterEach(() => {
  delete global.fetch;
});

test('seller mode groups incoming offers by listing and shows comparison details', async () => {
  mockGetOffers.mockResolvedValue([
    {
      _id: 'offer-1',
      listingId: 'item-1',
      buyerClerkUserId: 'buyer-1',
      sellerClerkUserId: 'seller-1',
      offeredPrice: 18,
      meetupHubId: 'plaza-americas',
      meetupLocation: 'Plaza of the Americas',
      meetupWindow: 'Tue 1:00 PM - 2:00 PM',
      paymentMethod: 'cash',
      message: 'Can meet after class.',
      status: 'pending',
      conversationId: 'conversation-1',
    },
    {
      _id: 'offer-2',
      listingId: 'item-1',
      buyerClerkUserId: 'buyer-2',
      sellerClerkUserId: 'seller-1',
      offeredPrice: 20,
      meetupHubId: 'library-west',
      meetupLocation: 'Library West',
      meetupWindow: 'Wed 3:00 PM - 4:00 PM',
      paymentMethod: 'externalApp',
      message: '',
      status: 'pending',
      conversationId: 'conversation-2',
    },
  ]);

  render(<OffersPage />);

  expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
  expect(screen.getByText('Buyer One')).toBeInTheDocument();
  expect(screen.getByText('Buyer Two')).toBeInTheDocument();
  expect(screen.getByText('$18')).toBeInTheDocument();
  expect(screen.getByText('External app')).toBeInTheDocument();
  expect(screen.getAllByText('Proposed meetup hub')).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: /accept/i })).toHaveLength(2);
});

test('seller mode can accept an offer and refresh the inbox', async () => {
  mockGetOffers
    .mockResolvedValueOnce([
      {
        _id: 'offer-1',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-1',
        sellerClerkUserId: 'seller-1',
        offeredPrice: 18,
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        meetupWindow: 'Tue 1:00 PM - 2:00 PM',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'pending',
        conversationId: 'conversation-1',
      },
    ])
    .mockResolvedValueOnce([
      {
        _id: 'offer-1',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-1',
        sellerClerkUserId: 'seller-1',
        offeredPrice: 18,
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        meetupWindow: 'Tue 1:00 PM - 2:00 PM',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'accepted',
        conversationId: 'conversation-1',
      },
    ]);
  mockUpdateOfferStatus.mockResolvedValue({});

  render(<OffersPage />);

  fireEvent.click(await screen.findByRole('button', { name: /accept/i }));

  await waitFor(() => {
    expect(mockUpdateOfferStatus).toHaveBeenCalledWith('offer-1', {
      requesterClerkUserId: 'seller-1',
      status: 'accepted',
    });
  });

  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Offer accepted',
      variant: 'success',
    })
  );
});

test('buyer mode shows sent offers and seller context', async () => {
  mockGetOffers
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        _id: 'offer-1',
        listingId: 'item-1',
        buyerClerkUserId: 'seller-1',
        sellerClerkUserId: 'seller-1',
        offeredPrice: 18,
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        meetupWindow: 'Tue 1:00 PM - 2:00 PM',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'pending',
        conversationId: 'conversation-1',
      },
    ]);

  render(<OffersPage />);

  fireEvent.click(await screen.findByRole('tab', { name: /buying/i }));

  expect(await screen.findByText('Seller: Seller One • 4.6/5')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /conversation/i })).toHaveAttribute(
    'href',
    '/messages/conversation-1'
  );
});

test('seller empty state keeps recovery action visible', async () => {
  mockGetOffers.mockResolvedValue([]);

  render(<OffersPage />);

  expect(await screen.findByText(/no incoming offers yet/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse listings/i })).toHaveAttribute('href', '/listings');
});
