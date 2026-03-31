import { render, screen } from '@testing-library/react';
import { MessagesPage } from './MessagesPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockGetConversations = jest.fn();

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/messagesApi', () => ({
  getConversations: (...args) => mockGetConversations(...args),
}));

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
      id: 'buyer-1',
    },
  });
  mockGetConversations.mockReset();

  global.fetch = jest.fn((url) => {
    if (url === 'http://localhost:5000/profile/seller-1') {
      return jsonResponse({
        profile: {
          profileName: 'Seller One',
        },
      });
    }

    if (url === 'http://localhost:5000/items/item-1') {
      return jsonResponse({
        _id: 'item-1',
        itemName: 'Desk Lamp',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });
});

afterEach(() => {
  delete global.fetch;
});

test('conversation previews include seller and listing context', async () => {
  mockGetConversations.mockResolvedValue([
    {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      lastMessageText: 'Is this still available?',
      lastMessageAt: '2026-03-29T12:00:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-28T12:00:00.000Z',
      },
    },
  ]);

  render(<MessagesPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText(/about desk lamp/i)).toBeInTheDocument();
  expect(screen.getByText('Is this still available?')).toBeInTheDocument();
  expect(screen.getByText('Unread')).toBeInTheDocument();
});

test('empty inbox shows the designed empty state', async () => {
  mockGetConversations.mockResolvedValue([]);

  render(<MessagesPage />);

  expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /browse listings/i })[0]).toHaveAttribute('href', '/listings');
});
