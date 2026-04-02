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
      activePickupNote: 'Meet outside the food court doors.',
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

test('participants can update the active pickup hub from the thread header', async () => {
  mockUpdateConversationPickup.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: 'plaza-americas',
      activePickupNote: 'I will wait by the benches.',
      lastMessageText: 'Pickup spot updated to Plaza of the Americas. Note: I will wait by the benches.',
      lastMessageAt: '2026-03-29T13:10:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-29T13:10:00.000Z',
      },
    },
    systemMessage: {
      _id: 'message-2',
      senderClerkUserId: 'system',
      body: 'Pickup spot updated to Plaza of the Americas. Note: I will wait by the benches.',
      createdAt: '2026-03-29T13:10:00.000Z',
    },
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /suggest different pickup spot/i }));
  fireEvent.click(screen.getByRole('radio', { name: /plaza of the americas/i }));
  fireEvent.change(screen.getByLabelText(/optional pickup note/i), {
    target: { value: 'I will wait by the benches.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /update pickup spot/i }));

  await waitFor(() => {
    expect(mockUpdateConversationPickup).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      requesterClerkUserId: 'buyer-1',
      pickupHubId: 'plaza-americas',
      pickupNote: 'I will wait by the benches.',
    });
  });

  expect(await screen.findByText('Plaza of the Americas')).toBeInTheDocument();
  expect(screen.getByText(/pickup spot updated to plaza of the americas/i)).toBeInTheDocument();
});
