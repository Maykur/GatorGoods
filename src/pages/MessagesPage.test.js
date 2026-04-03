import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

beforeEach(() => {
  resetClerkState();
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'buyer-1',
    },
  });
  mockGetConversations.mockReset();
});

test('conversation previews include seller and listing context', async () => {
  mockGetConversations.mockResolvedValue({
    conversations: [
      {
        _id: 'conversation-1',
        participantIds: ['buyer-1', 'seller-1'],
        otherParticipant: {
          id: 'seller-1',
          name: 'Seller One',
          avatarUrl: 'seller.png',
        },
        activeListingId: 'item-1',
        activeItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
        },
        linkedItemCount: 2,
        linkedItems: [
          {
            listingId: 'item-1',
            title: 'Desk Lamp',
            relationshipRole: 'buying',
            state: 'active',
          },
          {
            listingId: 'item-2',
            title: 'Mini Fridge',
            relationshipRole: 'selling',
            state: 'pending',
          },
        ],
        lastMessageText: 'Is this still available?',
        lastMessageSenderClerkUserId: 'buyer-1',
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-28T12:00:00.000Z',
        },
      },
    ],
    totalCount: 1,
    totalPages: 1,
    page: 1,
    pageSize: 5,
  });

  render(<MessagesPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText('Desk Lamp, Mini Fridge')).toBeInTheDocument();
  expect(screen.getByText('You: Is this still available?')).toBeInTheDocument();
  expect(screen.getByText('Unread')).toBeInTheDocument();
  expect(screen.getByLabelText('Selling in this thread')).toBeInTheDocument();
  fireEvent.mouseEnter(screen.getByLabelText('Selling in this thread'));
  expect(screen.getByRole('tooltip')).toHaveTextContent('You are selling an item in this conversation.');
  expect(screen.getByText(/1 unread on this page/i)).toBeInTheDocument();
  expect(screen.getByText(/1 pending pickup/i)).toBeInTheDocument();
});

test('conversation previews show compact extra-item counts for multi-item threads', async () => {
  mockGetConversations.mockResolvedValue({
    conversations: [
      {
        _id: 'conversation-1',
        participantIds: ['buyer-1', 'seller-1'],
        otherParticipant: {
          id: 'seller-1',
          name: 'Seller One',
          avatarUrl: '',
        },
        activeListingId: 'item-1',
        activeItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
        },
        linkedItemCount: 5,
        linkedItems: [
          {listingId: 'item-1', title: 'Desk Lamp', state: 'active'},
          {listingId: 'item-2', title: 'Mini Fridge', state: 'active'},
          {listingId: 'item-3', title: 'Poster Tube', state: 'active'},
          {listingId: 'item-4', title: 'Bike Helmet', state: 'completedHere'},
          {listingId: 'item-5', title: 'Storage Drawers', state: 'pending'},
        ],
        lastMessageText: 'Could bundle the lamp and fridge.',
        lastMessageSenderClerkUserId: 'seller-1',
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
        },
      },
    ],
    totalCount: 1,
    totalPages: 1,
    page: 1,
    pageSize: 5,
  });

  render(<MessagesPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText('+2 more')).toBeInTheDocument();
  expect(screen.getByText('Desk Lamp, Mini Fridge, Poster Tube')).toBeInTheDocument();
  expect(screen.getByText('Seller: Could bundle the lamp and fridge.')).toBeInTheDocument();
});

test('conversation previews truncate long item titles and long last messages', async () => {
  mockGetConversations.mockResolvedValue({
    conversations: [
      {
        _id: 'conversation-1',
        participantIds: ['buyer-1', 'seller-1'],
        otherParticipant: {
          id: 'seller-1',
          name: 'Seller One',
          avatarUrl: '',
        },
        activeItem: {
          listingId: 'item-1',
          title: 'Extra Long Standing Lamp',
        },
        linkedItemCount: 3,
        linkedItems: [
          {listingId: 'item-1', title: 'Extra Long Standing Lamp', state: 'active'},
          {listingId: 'item-2', title: 'Ridiculously Wide Storage Ottoman', state: 'active'},
          {listingId: 'item-3', title: 'Mini Fridge with Freezer Shelf', state: 'pending'},
        ],
        lastMessageText: 'This is a much longer message preview than we want to show in the inbox card at once.',
        lastMessageSenderClerkUserId: 'seller-1',
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
        },
      },
    ],
    totalCount: 1,
    totalPages: 1,
    page: 1,
    pageSize: 5,
  });

  render(<MessagesPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText('Extra Long Standing Lamp, Ridiculously Wide Stor..., Mini Fridge with Freez...')).toBeInTheDocument();
  expect(screen.getByText(/Seller: This is a much longer message/i)).toHaveAttribute(
    'title',
    'Seller: This is a much longer message preview than we want to show in the inbox card at once.'
  );
  expect(screen.queryByText(/refreshing inbox/i)).not.toBeInTheDocument();
});

test('conversation previews paginate in groups of five', async () => {
  mockGetConversations
    .mockResolvedValueOnce({
      conversations: Array.from({length: 5}, (_, index) => ({
        _id: `conversation-${index + 1}`,
        participantIds: ['buyer-1', `seller-${index + 1}`],
        otherParticipant: {
          id: `seller-${index + 1}`,
          name: `Seller ${index + 1}`,
          avatarUrl: '',
        },
        activeItem: {
          listingId: `item-${index + 1}`,
          title: `Item ${index + 1}`,
        },
        linkedItemCount: 1,
        linkedItems: [{listingId: `item-${index + 1}`, title: `Item ${index + 1}`, state: 'active'}],
        lastMessageText: 'Checking in',
        lastMessageSenderClerkUserId: `seller-${index + 1}`,
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
        },
      })),
      totalCount: 13,
      totalPages: 3,
      page: 1,
      pageSize: 5,
    })
    .mockResolvedValueOnce({
      conversations: Array.from({length: 5}, (_, index) => ({
        _id: `conversation-${index + 6}`,
        participantIds: ['buyer-1', `seller-${index + 6}`],
        otherParticipant: {
          id: `seller-${index + 6}`,
          name: `Seller ${index + 6}`,
          avatarUrl: '',
        },
        activeItem: {
          listingId: `item-${index + 6}`,
          title: `Item ${index + 6}`,
        },
        linkedItemCount: 1,
        linkedItems: [{listingId: `item-${index + 6}`, title: `Item ${index + 6}`, state: 'active'}],
        lastMessageText: 'Following up',
        lastMessageSenderClerkUserId: `seller-${index + 6}`,
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
        },
      })),
      totalCount: 13,
      totalPages: 3,
      page: 2,
      pageSize: 5,
    });

  render(<MessagesPage />);

  expect(await screen.findByText(/showing 1-5 of 13/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: /next/i}));

  await waitFor(() => {
    expect(mockGetConversations).toHaveBeenLastCalledWith('buyer-1', {
      page: 2,
      pageSize: 5,
    });
  });

  expect(await screen.findByText(/showing 6-10 of 13/i)).toBeInTheDocument();
});

test('empty inbox shows the designed empty state', async () => {
  mockGetConversations.mockResolvedValue({
    conversations: [],
    totalCount: 0,
    totalPages: 1,
    page: 1,
    pageSize: 5,
  });

  render(<MessagesPage />);

  expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /browse listings/i })[0]).toHaveAttribute('href', '/listings');
});
