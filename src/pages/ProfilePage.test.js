import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));
let mockRouteParams = { id: 'seller-1' };
let mockProfileResponse;
let mockSellerOffers;

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

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
      useParams: () => mockRouteParams,
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

function toLocalDateInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function buildProfileResponse(overrides = {}) {
  return {
    profile: {
      profileID: 'seller-1',
      profileName: 'Seller One',
      profilePicture: '',
      profileBanner: 'https://example.com/banner.png',
      profileBio: 'Selling a few trusted dorm essentials.',
      instagramUrl: 'https://instagram.com/sellerone',
      linkedinUrl: 'https://linkedin.com/in/sellerone',
      profileRating: 4.5,
      profileTotalRating: 9,
      ufVerified: true,
      profileFavorites: ['item-2'],
      trustMetrics: {
        reliability: 92,
        accuracy: 88,
        responsiveness: 100,
        safety: 81,
      },
      ...overrides.profile,
    },
    listings:
      overrides.listings ||
      [
        {
          _id: 'item-1',
          itemName: 'Desk Lamp',
          itemCost: '20',
          itemCondition: 'Good',
          itemLocation: 'Library West',
          itemPicture: 'lamp.png',
          itemCat: 'Electronics & Computers',
          userPublishingName: 'Seller One',
          status: 'active',
        },
      ],
  };
}

beforeEach(() => {
  resetClerkState();
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
  mockRouteParams = { id: 'seller-1' };
  mockProfileResponse = buildProfileResponse();
  mockSellerOffers = [];

  global.fetch = jest.fn((url, options = {}) => {
    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse(mockProfileResponse);
    }

    if (url === 'http://localhost:5000/api/offers?participantId=seller-1&role=seller') {
      return jsonResponse(mockSellerOffers);
    }

    if (url === 'http://localhost:5000/items/item-2') {
      return jsonResponse({
        _id: 'item-2',
        itemName: 'Mini Fridge',
        itemCost: '80',
        itemCondition: 'Fair',
        itemLocation: 'Broward Hall',
        itemPicture: 'fridge.png',
        itemCat: 'Home & Garden',
        userPublishingID: 'seller-2',
        userPublishingName: 'Seller Two',
        status: 'active',
      });
    }

    if (url === 'http://localhost:5000/user/seller-1' && options.method === 'PATCH') {
      return jsonResponse({
        ...mockProfileResponse.profile,
        profileName: 'Updated Seller',
        profileBio: 'Updated bio',
      });
    }

    if (url === 'http://localhost:5000/user/seller-1/fav/item-2' && options.method === 'DELETE') {
      return jsonResponse({ profileFavorites: [] });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
});

afterEach(() => {
  delete global.fetch;
});

test('signed-out users can view a public seller profile with trust metrics and connectors', async () => {
  render(<ProfilePage />);

  expect((await screen.findAllByText('Seller One')).length).toBeGreaterThan(0);
  expect(screen.getByText('UF verified')).toBeInTheDocument();
  expect(screen.getByText('92%')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
    'href',
    'https://instagram.com/sellerone'
  );
  expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/sellerone'
  );
  expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /save profile changes/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /open transaction/i })).not.toBeInTheDocument();
});

test('signed-in owners see their listings dashboard, edit form, and favorites shortcut', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  const displayNameInput = await screen.findByLabelText(/display name/i);
  await waitFor(() => {
    expect(displayNameInput).toHaveValue('Seller One');
  });
  expect(screen.getByLabelText(/short bio/i)).toHaveValue('Selling a few trusted dorm essentials.');
  expect(screen.getByRole('link', { name: /open favorites/i })).toHaveAttribute('href', '/favorites');
  expect(screen.getByText(/manage your current listings/i)).toBeInTheDocument();
});

test('signed-in owners can save lightweight public profile edits', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ProfilePage ownerView />);

  fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
  fireEvent.change(await screen.findByLabelText(/display name/i), {
    target: { value: 'Updated Seller' },
  });
  fireEvent.change(screen.getByLabelText(/short bio/i), {
    target: { value: 'Updated bio' },
  });
  fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/user/seller-1',
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });
  const patchCall = global.fetch.mock.calls.find(([url]) => url === 'http://localhost:5000/user/seller-1');
  expect(JSON.parse(patchCall[1].body)).toEqual(
    expect.objectContaining({
      profileName: 'Updated Seller',
      profileBio: 'Updated bio',
    })
  );

  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Profile updated',
      variant: 'success',
    })
  );
});

test('public profiles no longer show the generic review form', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });

  render(<ProfilePage />);

  expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
  expect(screen.queryByLabelText(/review rating/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /submit review score/i })).not.toBeInTheDocument();
});

test('owner view shows a transaction CTA only for the seller item scheduled today', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });
  mockProfileResponse = buildProfileResponse({
    listings: [
      {
        _id: 'item-1',
        itemName: 'Desk Lamp',
        itemCost: '20',
        itemCondition: 'Good',
        itemLocation: 'Library West',
        itemPicture: 'lamp.png',
        itemCat: 'Electronics & Computers',
        userPublishingName: 'Seller One',
        status: 'reserved',
      },
      {
        _id: 'item-2',
        itemName: 'Mini Fridge',
        itemCost: '80',
        itemCondition: 'Fair',
        itemLocation: 'Broward Hall',
        itemPicture: 'fridge.png',
        itemCat: 'Home & Garden',
        userPublishingName: 'Seller One',
        status: 'reserved',
      },
    ],
  });
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  mockSellerOffers = [
    {
      _id: 'offer-today',
      listingId: 'item-1',
      sellerClerkUserId: 'seller-1',
      status: 'accepted',
      meetupDate: toLocalDateInputValue(today),
      meetupTime: '16:30',
    },
    {
      _id: 'offer-tomorrow',
      listingId: 'item-2',
      sellerClerkUserId: 'seller-1',
      status: 'accepted',
      meetupDate: toLocalDateInputValue(tomorrow),
      meetupTime: '12:15',
    },
  ];

  render(<ProfilePage ownerView />);

  const transactionLinks = await screen.findAllByRole('link', { name: /open transaction/i });
  expect(transactionLinks).toHaveLength(1);
  expect(transactionLinks[0]).toHaveAttribute('href', '/transact/offer-today');
  expect(screen.queryByRole('link', { name: /transact view/i })).not.toBeInTheDocument();
});
