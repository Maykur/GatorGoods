import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));
let mockRouteParams = { id: 'seller-1' };

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

beforeEach(() => {
  resetClerkState();
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
  mockRouteParams = { id: 'seller-1' };

  global.fetch = jest.fn((url, options = {}) => {
    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileID: 'seller-1',
          profileName: 'Seller One',
          profilePicture: '',
          profileRating: 4.5,
          profileFavorites: ['item-2'],
        },
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
          },
        ],
      });
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
      });
    }

    if (url === 'http://localhost:5000/update_score/seller-1' && options.method === 'POST') {
      return jsonResponse({
        profileID: 'seller-1',
        profileName: 'Seller One',
        profilePicture: '',
        profileRating: 4.7,
        profileFavorites: ['item-2'],
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

test('signed-out users can view a public seller profile', async () => {
  render(<ProfilePage />);

  expect((await screen.findAllByText('Seller One')).length).toBeGreaterThan(0);
  expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  expect(screen.getAllByText('4.5/5').length).toBeGreaterThan(0);
  expect(screen.queryByRole('tab', { name: /favorites/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /submit review score/i })).not.toBeInTheDocument();
});

test('signed-in owners see their dashboard tabs and saved favorites', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ProfilePage ownerView />);

  expect(await screen.findByRole('tab', { name: /favorites/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /favorites/i }));

  expect(await screen.findByText('Mini Fridge')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remove favorite/i })).toBeInTheDocument();
});

test('signed-in non-owners can submit a seller review', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });

  render(<ProfilePage />);

  fireEvent.change(await screen.findByLabelText(/review rating/i), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit review score/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/update_score/seller-1',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Review submitted',
      variant: 'success',
    })
  );
});
