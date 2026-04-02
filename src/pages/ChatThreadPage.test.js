import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatThreadPage } from './ChatThreadPage';
import { resetClerkState, setClerkState } from '../testUtils/mockClerk';

const mockGetConversationMessages = jest.fn();
const mockSendMessage = jest.fn();
const mockUpdateConversationPickup = jest.fn();

jest.mock('@clerk/react', () => {
  const { getClerkState } = require('../testUtils/mockClerk');

  return {
    useUser: () => getClerkState(),
  };
});

jest.mock('../lib/messagesApi', () => ({
  getConversationMessages: (...args) => mockGetConversationMessages(...args),
  sendMessage: (...args) => mockSendMessage(...args),
  updateConversationPickup: (...args) => mockUpdateConversationPickup(...args),
}));

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
      useParams: () => ({ conversationId: 'conversation-1' }),
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

  mockGetConversationMessages.mockReset();
  mockSendMessage.mockReset();
  mockUpdateConversationPickup.mockReset();
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      lastMessageText: 'Sounds good',
      lastMessageAt: '2026-03-29T13:00:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-29T13:00:00.000Z',
      },
    },
    messages: [
      {
        _id: 'message-1',
        senderClerkUserId: 'seller-1',
        body: 'Hi there',
        createdAt: '2026-03-29T12:00:00.000Z',
      },
    ],
  });
  mockSendMessage.mockResolvedValue({
    _id: 'message-2',
    senderClerkUserId: 'buyer-1',
    body: 'I can pick it up today.',
    createdAt: '2026-03-29T13:05:00.000Z',
  });

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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

test('thread view renders participant and listing context', async () => {
  render(<ChatThreadPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText(/listings in this conversation/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /desk lamp/i })).toHaveAttribute('href', '/items/item-1');
  expect(screen.getByRole('link', { name: /seller one/i })).toHaveAttribute('href', '/profile/seller-1');
  expect(screen.getByText('Hi there')).toBeInTheDocument();
  expect(screen.getByText('Reitz Union')).toBeInTheDocument();
  expect(screen.getByText(/meet outside the food court doors\./i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /edit meetup details/i })).not.toBeInTheDocument();
});

test('threads without an active negotiated hub fall back to the listing original public hub', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: '',
      activePickupSpecifics: '',
      lastMessageText: 'Still available?',
      lastMessageAt: '2026-03-29T13:00:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-29T13:00:00.000Z',
      },
    },
    messages: [],
  });
  global.fetch.mockImplementation((url) => {
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
        originalPickupHubId: 'library-west',
        originalItemLocation: 'Library West',
        pickupHubId: 'plaza-americas',
        itemLocation: 'Plaza of the Americas',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  expect(await screen.findByText('Library West')).toBeInTheDocument();
  expect(screen.getByText(/seller will add the exact meetup specifics/i)).toBeInTheDocument();
});

test('accepted threads fall back to the listing current reserved hub when specifics exist but the hub id is missing', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: '',
      activePickupSpecifics: 'By the tables outside',
      lastMessageText: 'Offer accepted.',
      lastMessageAt: '2026-04-01T21:27:21.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-04-01T21:27:21.000Z',
      },
    },
    messages: [
      {
        _id: 'message-3',
        senderClerkUserId: 'system',
        body: 'Offer accepted. Meetup hub: Marston Science Library. Meetup specifics: By the tables outside',
        createdAt: '2026-04-01T21:27:21.000Z',
      },
    ],
  });
  global.fetch.mockImplementation((url) => {
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
        originalPickupHubId: 'library-west',
        originalItemLocation: 'Library West',
        pickupHubId: 'marston',
        itemLocation: 'Marston Science Library',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  expect(await screen.findByText('Marston Science Library')).toBeInTheDocument();
  expect(screen.getByText('Meetup specifics')).toBeInTheDocument();
  expect(screen.getAllByText(/by the tables outside/i)).toHaveLength(2);
});

test('sending a message appends it to the thread', async () => {
  render(<ChatThreadPage />);

  fireEvent.change(await screen.findByLabelText(/^message$/i), {
    target: { value: 'I can pick it up today.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));

  await waitFor(() => {
    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      senderClerkUserId: 'buyer-1',
      body: 'I can pick it up today.',
      attachedListingId: 'item-1',
    });
  });

  expect(await screen.findByText('I can pick it up today.')).toBeInTheDocument();
});

test('seller can update the active meetup details from the thread header', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  mockUpdateConversationPickup.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: 'plaza-americas',
      activePickupSpecifics: 'I will wait by the benches.',
      lastMessageText: 'Meetup details updated to Plaza of the Americas. Specifics: I will wait by the benches.',
      lastMessageAt: '2026-03-29T13:10:00.000Z',
      lastReadAtByUser: {
        'seller-1': '2026-03-29T13:10:00.000Z',
      },
    },
    systemMessage: {
      _id: 'message-2',
      senderClerkUserId: 'system',
      body: 'Meetup details updated to Plaza of the Americas. Specifics: I will wait by the benches.',
      createdAt: '2026-03-29T13:10:00.000Z',
    },
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /edit meetup details/i }));
  fireEvent.click(screen.getByRole('radio', { name: /plaza of the americas/i }));
  fireEvent.change(screen.getByLabelText(/meetup specifics/i), {
    target: { value: 'I will wait by the benches.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /save meetup details/i }));

  await waitFor(() => {
    expect(mockUpdateConversationPickup).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      requesterClerkUserId: 'seller-1',
      pickupHubId: 'plaza-americas',
      pickupSpecifics: 'I will wait by the benches.',
    });
  });

  expect(await screen.findByText('Plaza of the Americas')).toBeInTheDocument();
  expect(screen.getByText(/meetup details updated to plaza of the americas/i)).toBeInTheDocument();
});

test('seller cannot submit meetup updates without required specifics', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /edit meetup details/i }));
  fireEvent.change(screen.getByLabelText(/meetup specifics/i), {
    target: { value: 'short' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^save meetup details$/i }));

  expect(mockUpdateConversationPickup).not.toHaveBeenCalled();
  expect(await screen.findByText(/meetup specifics must be at least 8 characters/i)).toBeInTheDocument();
});
