import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ItemPage } from './ItemPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockNavigate = jest.fn();
const mockCreateConversation = jest.fn();
const mockCreateOffer = jest.fn();
const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));

jest.mock('@clerk/react', () => {
  const React = require('react');
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    SignInButton: ({ children }) => React.createElement(React.Fragment, null, children),
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/messagesApi', () => ({
  createConversation: (...args) => mockCreateConversation(...args),
}));

jest.mock('../lib/offersApi', () => ({
  createOffer: (...args) => mockCreateOffer(...args),
}));

jest.mock('../components/ui', () => {
  const actual = jest.requireActual('../components/ui');

  return {
    ...actual,
    useToast: () => ({
      showToast: mockShowToast,
    }),
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
      useParams: () => ({ id: 'item-1' }),
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

function buildItemPayload(overrides = {}) {
  return {
    _id: 'item-1',
    itemName: 'Desk Lamp',
    itemCost: '20',
    itemCondition: 'Good',
    pickupHubId: 'library-west',
    itemLocation: 'Library West',
    itemPicture: 'lamp.png',
    itemDescription: 'Lamp for studying',
    itemDetails: 'Warm bulb included',
    userPublishingID: 'seller-1',
    userPublishingName: 'Seller One',
    status: 'active',
    ...overrides,
  };
}

beforeEach(() => {
  resetClerkState();
  global.fetch = jest.fn((url, options = {}) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse(buildItemPayload());
    }

    if (url === 'http://localhost:5000/profile/buyer-1') {
      return jsonResponse({
        profile: {
          profileFavorites: ['item-1'],
        },
      });
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileFavorites: [],
          profileRating: 4.3,
          profileTotalRating: 9,
          trustMetrics: {
            reliability: 92,
            accuracy: 88,
            responsiveness: 100,
            safety: 81,
          },
        },
      });
    }

    if (url === 'http://localhost:5000/item/item-1' && options.method === 'DELETE') {
      return jsonResponse({ message: 'Listing deleted' });
    }

    if (url === 'http://localhost:5000/user/buyer-1/fav/item-1') {
      return jsonResponse({ profileFavorites: [] });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
  mockNavigate.mockReset();
  mockCreateConversation.mockReset();
  mockCreateOffer.mockReset();
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
});

afterEach(() => {
  delete global.fetch;
});

test('signed-out users can view the item and see an offer-first login CTA', async () => {
  render(<ItemPage />);

  expect(await screen.findByRole('heading', { name: 'Desk Lamp' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in to make offer/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /favorite/i })).not.toBeInTheDocument();
  expect(await screen.findByText('4.3/5')).toBeInTheDocument();
});

test('public item page shows the original public hub instead of the negotiated current hub', async () => {
  global.fetch.mockImplementation((url, options = {}) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse(
        buildItemPayload({
          originalPickupHubId: 'library-west',
          originalPickupArea: 'Historic Core',
          originalItemLocation: 'Library West',
          pickupHubId: 'reitz',
          pickupArea: 'South Core',
          itemLocation: 'Reitz Union',
        })
      );
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileFavorites: [],
          profileRating: 4.3,
          profileTotalRating: 9,
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

  render(<ItemPage />);

  expect(await screen.findByRole('heading', { name: 'Desk Lamp' })).toBeInTheDocument();
  expect(screen.getByText('Library West')).toBeInTheDocument();
  expect(screen.queryByText('Reitz Union')).not.toBeInTheDocument();
});

test('signed-in non-owners can open and submit the structured offer form', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
      fullName: 'Buyer One',
    },
  });
  mockCreateOffer.mockResolvedValue({
    _id: 'offer-1',
    conversationId: 'conversation-1',
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole('button', { name: /make offer/i }));

  fireEvent.change(screen.getByLabelText(/your offer/i), {
    target: { value: '18' },
  });
  fireEvent.change(screen.getByLabelText(/meetup window/i), {
    target: { value: 'Tue 1:00 PM - 2:00 PM' },
  });
  fireEvent.change(screen.getByLabelText(/optional note/i), {
    target: { value: 'Can meet after class.' },
  });

  fireEvent.click(screen.getByRole('button', { name: /send offer/i }));

  await waitFor(() => {
    expect(mockCreateOffer).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        buyerClerkUserId: 'buyer-1',
        buyerDisplayName: 'Buyer One',
        offeredPrice: 18,
        meetupHubId: 'library-west',
        meetupLocation: 'Library West',
        meetupWindow: 'Tue 1:00 PM - 2:00 PM',
        paymentMethod: 'cash',
        message: 'Can meet after class.',
      })
    );
  });

  expect(await screen.findByText(/your offer is waiting for the seller/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open offers inbox/i })).toHaveAttribute('href', '/offers');
  expect(screen.getByRole('link', { name: /open conversation/i })).toHaveAttribute(
    'href',
    '/messages/conversation-1'
  );
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Offer sent',
      variant: 'success',
    })
  );
});

test('offer submission validates the structured fields before sending', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole('button', { name: /make offer/i }));
  fireEvent.change(screen.getByLabelText(/payment method/i), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send offer/i }));

  expect(await screen.findByText(/please complete the offer details before sending it/i)).toBeInTheDocument();
  expect(mockCreateOffer).not.toHaveBeenCalled();
});

test('buyers can choose a different approved meetup hub before sending an offer', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
      fullName: 'Buyer One',
    },
  });
  mockCreateOffer.mockResolvedValue({
    _id: 'offer-2',
    conversationId: 'conversation-2',
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole('button', { name: /make offer/i }));
  fireEvent.click(screen.getByRole('radio', { name: /reitz union/i }));
  fireEvent.change(screen.getByLabelText(/your offer/i), {
    target: { value: '19' },
  });
  fireEvent.change(screen.getByLabelText(/meetup window/i), {
    target: { value: 'Wed 3:00 PM - 4:00 PM' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send offer/i }));

  await waitFor(() => {
    expect(mockCreateOffer).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        meetupHubId: 'reitz',
        meetupLocation: 'Reitz Union',
      })
    );
  });
});

test('offer form defaults to the listing original public hub when the reserved hub differs', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
      fullName: 'Buyer One',
    },
  });
  global.fetch.mockImplementation((url, options = {}) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse(
        buildItemPayload({
          originalPickupHubId: 'library-west',
          originalPickupArea: 'Historic Core',
          originalItemLocation: 'Library West',
          pickupHubId: 'plaza-americas',
          pickupArea: 'Historic Core',
          itemLocation: 'Plaza of the Americas',
        })
      );
    }

    if (url === 'http://localhost:5000/profile/buyer-1') {
      return jsonResponse({
        profile: {
          profileFavorites: ['item-1'],
        },
      });
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileFavorites: [],
          profileRating: 4.3,
          profileTotalRating: 9,
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
  mockCreateOffer.mockResolvedValue({
    _id: 'offer-3',
    conversationId: 'conversation-3',
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole('button', { name: /make offer/i }));
  fireEvent.change(screen.getByLabelText(/your offer/i), {
    target: { value: '17' },
  });
  fireEvent.change(screen.getByLabelText(/meetup window/i), {
    target: { value: 'Thu 2:00 PM - 3:00 PM' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send offer/i }));

  await waitFor(() => {
    expect(mockCreateOffer).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        meetupHubId: 'library-west',
        meetupLocation: 'Library West',
      })
    );
  });
});

test('signed-in owners still see the delete control', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ItemPage />);

  expect(await screen.findByRole('button', { name: /delete listing/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /make offer/i })).not.toBeInTheDocument();
});

test('successful delete only navigates after a successful response', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ItemPage />);

  fireEvent.click(await screen.findByRole('button', { name: /delete listing/i }));

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/listings');
  });
  expect(mockConfirm).toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Listing deleted',
      variant: 'success',
    })
  );
});

test('reserved listings disable the offer action and explain why', async () => {
  global.fetch.mockImplementation((url, options = {}) => {
    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse(buildItemPayload({ status: 'reserved' }));
    }

    if (url === 'http://localhost:5000/profile/buyer-1') {
      return jsonResponse({
        profile: {
          profileFavorites: [],
        },
      });
    }

    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileRating: 4.3,
          profileTotalRating: 9,
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
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });

  render(<ItemPage />);

  expect(await screen.findByText(/this listing already has an accepted offer/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /make offer/i })).toBeDisabled();
});
