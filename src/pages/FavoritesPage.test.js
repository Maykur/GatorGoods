import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FavoritesPage } from './FavoritesPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockShowToast = jest.fn();
const mockConfirm = jest.fn(() => Promise.resolve(true));

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
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
  mockShowToast.mockReset();
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);

  global.fetch = jest.fn((url, options = {}) => {
    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileID: 'seller-1',
          profileFavorites: ['item-2'],
        },
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
        status: 'active',
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

test('loads and renders saved favorites on the dedicated page', async () => {
  render(<FavoritesPage />);

  expect(await screen.findByText('Mini Fridge')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remove favorite/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse listings/i })).toHaveAttribute('href', '/listings');
});

test('removing a favorite refreshes the dedicated favorites page', async () => {
  render(<FavoritesPage />);

  fireEvent.click(await screen.findByRole('button', { name: /remove favorite/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/user/seller-1/fav/item-2',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Favorite removed',
      variant: 'success',
    })
  );
});
