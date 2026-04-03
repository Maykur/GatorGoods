import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OffersPage } from './OffersPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';
import { toLocalDateInputValue } from '../lib/meetupSchedule';

const mockGetOffers = jest.fn();
const mockUpdateOfferStatus = jest.fn();
const mockGetTransactionByOfferId = jest.fn();
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

jest.mock('../lib/transactionsApi', () => ({
  getTransactionByOfferId: (...args) => mockGetTransactionByOfferId(...args),
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
  window.history.pushState({}, '', '/offers');
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
  mockGetTransactionByOfferId.mockReset();
  mockShowToast.mockReset();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
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
      meetupDate: '2026-04-07',
      meetupTime: '13:00',
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
      meetupDate: '2026-04-08',
      meetupTime: '15:00',
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
  expect(screen.getByText('Tue, Apr 7 at 1:00 PM')).toBeInTheDocument();
  expect(screen.getAllByText('Proposed meetup hub')).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: /accept/i })).toHaveLength(2);
});

test('seller mode requires meetup specifics before accepting an offer', async () => {
  mockGetOffers.mockResolvedValue([
    {
      _id: 'offer-1',
      listingId: 'item-1',
      buyerClerkUserId: 'buyer-1',
      sellerClerkUserId: 'seller-1',
      offeredPrice: 18,
      meetupHubId: 'plaza-americas',
      meetupLocation: 'Plaza of the Americas',
      meetupDate: '2026-04-07',
      meetupTime: '13:00',
      paymentMethod: 'cash',
      message: 'Can meet after class.',
      status: 'pending',
      conversationId: 'conversation-1',
    },
  ]);

  render(<OffersPage />);

  fireEvent.click(await screen.findByRole('button', { name: /^accept$/i }));
  fireEvent.click(screen.getByRole('button', { name: /confirm acceptance/i }));

  expect(mockUpdateOfferStatus).not.toHaveBeenCalled();
  expect(await screen.findByText(/meetup specifics must be at least 8 characters/i)).toBeInTheDocument();
});

test('seller mode can accept an offer with required meetup specifics and refresh the inbox', async () => {
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
        meetupDate: '2026-04-07',
        meetupTime: '13:00',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'pending',
        conversationId: 'conversation-1',
      },
    ])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        _id: 'offer-1',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-1',
        sellerClerkUserId: 'seller-1',
        offeredPrice: 18,
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        meetupDate: '2026-04-07',
        meetupTime: '13:00',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'accepted',
        conversationId: 'conversation-1',
      },
    ])
    .mockResolvedValueOnce([]);
  mockUpdateOfferStatus.mockResolvedValue({});
  mockGetTransactionByOfferId.mockResolvedValue({
    _id: 'transaction-1',
    offerId: 'offer-1',
    listingId: 'item-1',
    conversationId: 'conversation-1',
    buyerClerkUserId: 'buyer-1',
    sellerClerkUserId: 'seller-1',
    acceptedTerms: {
      price: 18,
      paymentMethod: 'cash',
      meetupHubId: 'plaza-americas',
      meetupLocation: 'Plaza of the Americas',
      pickupSpecifics: 'Meet outside the Plaza benches.',
      meetupDate: '2026-04-07',
      meetupTime: '13:00',
    },
    status: 'scheduled',
  });

  render(<OffersPage />);

  fireEvent.click(await screen.findByRole('button', { name: /^accept$/i }));
  fireEvent.change(screen.getByLabelText(/meetup specifics/i), {
    target: { value: 'Meet outside the Plaza benches.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /confirm acceptance/i }));

  await waitFor(() => {
    expect(mockUpdateOfferStatus).toHaveBeenCalledWith('offer-1', {
      requesterClerkUserId: 'seller-1',
      status: 'accepted',
      pickupSpecifics: 'Meet outside the Plaza benches.',
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
        meetupDate: '2026-04-07',
        meetupTime: '13:00',
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

test('offers page shows a transactions tab and auto-selects it when a transaction is scheduled today', async () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  mockGetOffers
    .mockResolvedValueOnce([
      {
        _id: 'offer-today',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-1',
        sellerClerkUserId: 'seller-1',
        buyerDisplayName: 'Buyer One',
        offeredPrice: 18,
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        meetupDate: toLocalDateInputValue(today),
        meetupTime: '13:00',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'accepted',
        conversationId: 'conversation-1',
      },
      {
        _id: 'offer-tomorrow',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-2',
        sellerClerkUserId: 'seller-1',
        buyerDisplayName: 'Buyer Two',
        offeredPrice: 22,
        meetupHubId: 'library-west',
        meetupLocation: 'Library West',
        meetupDate: toLocalDateInputValue(tomorrow),
        meetupTime: '15:00',
        paymentMethod: 'externalApp',
        message: 'Can do tomorrow afternoon.',
        status: 'accepted',
        conversationId: 'conversation-2',
      },
    ])
    .mockResolvedValueOnce([]);
  mockGetTransactionByOfferId
    .mockResolvedValueOnce({
      _id: 'transaction-1',
      offerId: 'offer-today',
      listingId: 'item-1',
      conversationId: 'conversation-1',
      buyerClerkUserId: 'buyer-1',
      sellerClerkUserId: 'seller-1',
      acceptedTerms: {
        price: 18,
        paymentMethod: 'cash',
        meetupHubId: 'plaza-americas',
        meetupLocation: 'Plaza of the Americas',
        pickupSpecifics: 'Meet by the benches.',
        meetupDate: toLocalDateInputValue(today),
        meetupTime: '13:00',
      },
      status: 'scheduled',
    })
    .mockResolvedValueOnce({
      _id: 'transaction-2',
      offerId: 'offer-tomorrow',
      listingId: 'item-1',
      conversationId: 'conversation-2',
      buyerClerkUserId: 'buyer-2',
      sellerClerkUserId: 'seller-1',
      acceptedTerms: {
        price: 22,
        paymentMethod: 'externalApp',
        meetupHubId: 'library-west',
        meetupLocation: 'Library West',
        pickupSpecifics: 'Meet at the main entrance.',
        meetupDate: toLocalDateInputValue(tomorrow),
        meetupTime: '15:00',
      },
      status: 'scheduled',
    });

  render(<OffersPage />);

  const transactionsTab = await screen.findByRole('tab', { name: /transactions/i });
  await waitFor(() => {
    expect(transactionsTab).toHaveAttribute('aria-selected', 'true');
  });

  expect(await screen.findByText(/scheduled for today/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open transaction/i })).toHaveAttribute('href', '/transact/offer-today');
  expect(screen.queryByText(/buyer two/i)).not.toBeInTheDocument();
});

test('chat-style transaction cards are not shown for empty transactions state', async () => {
  mockGetOffers.mockResolvedValue([]);

  render(<OffersPage />);

  fireEvent.click(await screen.findByRole('tab', { name: /transactions/i }));

  expect(await screen.findByText(/no active transactions yet/i)).toBeInTheDocument();
});

test('offers page scrolls to a requested buyer offer from the query string', async () => {
  window.history.pushState({}, '', '/offers?mode=buyer&offer=offer-1');
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
        meetupDate: '2026-04-07',
        meetupTime: '13:00',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
        status: 'pending',
        conversationId: 'conversation-1',
      },
    ]);

  render(<OffersPage />);

  const targetCard = await screen.findByText('Desk Lamp');
  expect(targetCard).toBeInTheDocument();

  await waitFor(() => {
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

test('seller empty state keeps recovery action visible', async () => {
  mockGetOffers.mockResolvedValue([]);

  render(<OffersPage />);

  expect(await screen.findByText(/no incoming offers yet/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse listings/i })).toHaveAttribute('href', '/listings');
});
