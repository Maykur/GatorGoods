import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        lastContextAt: '2026-03-29T12:20:00.000Z',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 2,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          lastContextAt: '2026-03-29T12:20:00.000Z',
          latestContextMessageId: 'message-1',
        },
        {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
          lastContextAt: '2026-03-29T12:10:00.000Z',
          latestContextMessageId: 'message-2',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        attachedItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
        },
      },
      {
        _id: 'message-2',
        senderClerkUserId: 'seller-1',
        body: 'The chair is still available too.',
        createdAt: '2026-03-29T12:20:00.000Z',
        attachedItem: {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
        },
      },
    ],
  });
  mockSendMessage.mockResolvedValue({
    _id: 'message-new',
    senderClerkUserId: 'buyer-1',
    body: 'I can pick it up today.',
    createdAt: '2026-03-29T13:05:00.000Z',
    attachedItem: {
      listingId: 'item-1',
      title: 'Desk Lamp',
      imageUrl: 'lamp.png',
      state: 'active',
    },
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
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.scrollTo = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

test('thread view renders participant and listing context', async () => {
  render(<ChatThreadPage />);

  expect(await screen.findByRole('heading', { name: 'Seller One' })).toBeInTheDocument();
  expect(screen.getByText(/items in this conversation/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /desk lamp\. active\./i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /study chair\. active\./i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open item/i })).toHaveAttribute('href', '/items/item-1');
  expect(screen.getByRole('link', { name: /seller one/i })).toHaveAttribute('href', '/profile/seller-1');
  expect(screen.getByText('Hi there')).toBeInTheDocument();
  expect(screen.getByText('Reitz Union')).toBeInTheDocument();
  expect(screen.getByText(/meet outside the food court doors\./i)).toBeInTheDocument();
  expect(screen.getByText('Available')).toBeInTheDocument();
  expect(await screen.findByText(/Matte black desk lamp with an adjustable neck/i)).toBeInTheDocument();
  expect(screen.getByTestId('composer-item-context')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /edit meetup details/i })).not.toBeInTheDocument();
});

test('rail keeps pending items first, then active items, then inactive history with recency inside each group', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        lastContextAt: '2026-03-29T12:00:00.000Z',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 5,
      linkedItems: [
        {
          listingId: 'item-5',
          title: 'Poster Tube',
          imageUrl: 'tube.png',
          state: 'unavailable',
          lastContextAt: '2026-03-29T12:30:00.000Z',
          latestContextMessageId: 'message-5',
        },
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          lastContextAt: '2026-03-29T12:00:00.000Z',
          latestContextMessageId: 'message-1',
        },
        {
          listingId: 'item-4',
          title: 'Bike Helmet',
          imageUrl: 'helmet.png',
          state: 'completedHere',
          lastContextAt: '2026-03-29T12:20:00.000Z',
          latestContextMessageId: 'message-4',
        },
        {
          listingId: 'item-3',
          title: 'Mini Fridge',
          imageUrl: 'fridge.png',
          state: 'pending',
          lastContextAt: '2026-03-29T11:10:00.000Z',
          latestContextMessageId: 'message-3',
        },
        {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
          lastContextAt: '2026-03-29T11:50:00.000Z',
          latestContextMessageId: 'message-2',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    if (url === 'http://localhost:5000/items/item-4') {
      return jsonResponse({
        _id: 'item-4',
        itemName: 'Bike Helmet',
        pickupHubId: 'reitz',
        itemLocation: 'Reitz Union',
        itemDescription: 'Matte bike helmet with reflective strips and a secure rear dial.',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  await screen.findByRole('heading', { name: 'Seller One' });

  const chipLabels = screen
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter((text) => ['Desk Lamp', 'Mini Fridge', 'Study Chair', 'Poster Tube', 'Bike Helmet'].includes(text));

  expect(chipLabels).toEqual([
    'Mini Fridge',
    'Desk Lamp',
    'Study Chair',
    'Poster Tube',
    'Bike Helmet',
  ]);
});

test('pending chips behave like selectable message context and can be toggled off by clicking again', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 2,
      linkedItems: [
        {
          listingId: 'item-3',
          title: 'Mini Fridge',
          imageUrl: 'fridge.png',
          state: 'pending',
          latestContextMessageId: 'message-3',
        },
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        body: 'Lamp update',
        createdAt: '2026-03-29T12:00:00.000Z',
      },
      {
        _id: 'message-3',
        senderClerkUserId: 'system',
        body: 'Offer accepted for the fridge.',
        createdAt: '2026-03-29T12:10:00.000Z',
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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    if (url === 'http://localhost:5000/items/item-3') {
      return jsonResponse({
        _id: 'item-3',
        itemName: 'Mini Fridge',
        pickupHubId: 'reitz',
        itemLocation: 'Reitz Union',
        itemDescription: 'Compact mini fridge with one accepted offer still in progress.',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  expect(await screen.findByRole('button', { name: /mini fridge\. pending in this thread\./i })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByTestId('composer-item-context')).toHaveTextContent('Mini Fridge');
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(await screen.findByText(/Compact mini fridge with one accepted offer/i)).toBeInTheDocument();

  fireEvent.click(await screen.findByRole('button', { name: /mini fridge\. pending in this thread\./i }));
  expect(screen.queryByTestId('composer-item-context')).not.toBeInTheDocument();
});

test('composer context can be cleared so the next message sends without an item tag', async () => {
  render(<ChatThreadPage />);

  expect(await screen.findByTestId('composer-item-context')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /clear/i }));

  expect(screen.queryByTestId('composer-item-context')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: 'Quick question that is not about one item.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));

  await waitFor(() => {
    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      senderClerkUserId: 'buyer-1',
      body: 'Quick question that is not about one item.',
      attachedListingId: null,
    });
  });
});

test('pressing Enter sends the message while Shift+Enter still allows multiline drafts', async () => {
  render(<ChatThreadPage />);

  const messageField = await screen.findByLabelText(/^message$/i);

  fireEvent.change(messageField, {
    target: { value: 'Line one' },
  });

  fireEvent.keyDown(messageField, {
    key: 'Enter',
    code: 'Enter',
    shiftKey: true,
  });

  expect(mockSendMessage).not.toHaveBeenCalled();

  fireEvent.keyDown(messageField, {
    key: 'Enter',
    code: 'Enter',
  });

  await waitFor(() => {
    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      senderClerkUserId: 'buyer-1',
      body: 'Line one',
      attachedListingId: 'item-1',
    });
  });
});

test('message item pills render for tagged messages only when the thread has multiple linked items', async () => {
  render(<ChatThreadPage />);

  await screen.findByRole('heading', { name: 'Seller One' });

  const attachedItemPills = screen.getAllByTestId('message-attached-item-pill');

  expect(attachedItemPills).toHaveLength(2);
  expect(attachedItemPills[0]).toHaveTextContent('Desk Lamp');
  expect(attachedItemPills[0]).toHaveAttribute('href', '/items/item-1');
  expect(attachedItemPills[1]).toHaveTextContent('Study Chair');
  expect(attachedItemPills[1]).toHaveAttribute('href', '/items/item-2');
  expect(screen.getByTestId('composer-item-context').querySelector('a')).toBeNull();
});

test('offer system messages render compact summaries and the focused item card shows the current offer summary', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        latestContextMessageId: 'message-1',
        currentOffer: {
          status: 'pending',
          title: 'Offer pending',
          detailLine: '$45 • Cash • Reitz Union',
        },
      },
      linkedItemCount: 2,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
          currentOffer: {
            status: 'pending',
            title: 'Offer pending',
            detailLine: '$45 • Cash • Reitz Union',
          },
        },
        {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
          latestContextMessageId: 'message-2',
          currentOffer: null,
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: false,
      lastMessageText: 'Offer sent.',
      lastMessageAt: '2026-03-29T13:00:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-29T13:00:00.000Z',
      },
    },
    messages: [
      {
        _id: 'message-1',
        senderClerkUserId: 'system',
        body: 'Offer sent.',
        createdAt: '2026-03-29T12:00:00.000Z',
        attachedItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
        },
        offerContext: {
          eventType: 'sent',
          title: 'You sent an offer',
          detailLine: '$45 • Cash • Reitz Union',
        },
      },
      {
        _id: 'message-2',
        senderClerkUserId: 'system',
        body: 'Offer rejected.',
        createdAt: '2026-03-29T12:10:00.000Z',
        attachedItem: {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
        },
        offerContext: {
          eventType: 'declined',
          title: 'Offer rejected',
          detailLine: '',
        },
      },
    ],
  });

  render(<ChatThreadPage />);

  expect(await screen.findByText('You sent an offer')).toBeInTheDocument();
  expect(screen.getByText('Offer pending')).toBeInTheDocument();
  expect(screen.getByText('$45')).toBeInTheDocument();
  expect(screen.getByText('Cash')).toBeInTheDocument();
  expect(screen.getAllByText('Reitz Union').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Offer rejected')).toBeInTheDocument();
});

test('mixed-direction threads surface buying and selling context in the focused item card', async () => {
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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    if (url === 'http://localhost:5000/items/item-2') {
      return jsonResponse({
        _id: 'item-2',
        itemName: 'Study Chair',
        pickupHubId: 'hume',
        itemLocation: 'Hume Hall',
        itemDescription: 'Rolling study chair with a padded seat.',
        userPublishingID: 'buyer-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        relationshipRole: 'buying',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 2,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          relationshipRole: 'buying',
          latestContextMessageId: 'message-1',
        },
        {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
          relationshipRole: 'selling',
          latestContextMessageId: 'message-2',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        body: 'Lamp update',
        createdAt: '2026-03-29T12:00:00.000Z',
        attachedItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          relationshipRole: 'buying',
        },
      },
      {
        _id: 'message-2',
        senderClerkUserId: 'buyer-1',
        body: 'I am also selling the chair if you still want it.',
        createdAt: '2026-03-29T12:20:00.000Z',
        attachedItem: {
          listingId: 'item-2',
          title: 'Study Chair',
          imageUrl: 'chair.png',
          state: 'active',
          relationshipRole: 'selling',
        },
      },
    ],
  });

  render(<ChatThreadPage />);

  expect(await screen.findByText('Buying')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /study chair\. active\./i }));

  expect(await screen.findByText('Selling')).toBeInTheDocument();
  expect(screen.getByText('Meetup specifics appear here after you confirm an offer for this item.')).toBeInTheDocument();
  expect(screen.getByText('Need a different meetup hub? The buyer can suggest one in their offer.')).toBeInTheDocument();
});

test('tapping another active item chip changes the next message context locally', async () => {
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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    if (url === 'http://localhost:5000/items/item-2') {
      return jsonResponse({
        _id: 'item-2',
        itemName: 'Study Chair',
        originalPickupHubId: 'reitz',
        originalItemLocation: 'Reitz Union',
        pickupHubId: 'honors-village',
        itemLocation: 'Honors Village',
        itemDescription: 'Comfortable study chair with a padded seat and rolling base.',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /study chair\. active\./i }));
  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: 'Can you hold the chair for me?' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));

  await waitFor(() => {
    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      senderClerkUserId: 'buyer-1',
      body: 'Can you hold the chair for me?',
      attachedListingId: 'item-2',
    });
  });

  expect(screen.getByRole('link', { name: /open item/i })).toHaveAttribute('href', '/items/item-2');
  expect(screen.getByText('Selected item location')).toBeInTheDocument();
  expect(screen.getAllByText('Meetup specifics').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Meetup specifics appear here after the seller confirms an offer for this item.')).toBeInTheDocument();
  expect(screen.getByText('Want to meet somewhere else? Suggest a different meetup hub in your offer to the seller.')).toBeInTheDocument();
});

test('tapping a historical item chip jumps to its latest thread message and clears compose context', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 4,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
        },
        {
          listingId: 'item-3',
          title: 'Mini Fridge',
          imageUrl: 'fridge.png',
          state: 'pending',
          latestContextMessageId: 'message-3',
        },
        {
          listingId: 'item-4',
          title: 'Bike Helmet',
          imageUrl: 'helmet.png',
          state: 'completedHere',
          latestContextMessageId: 'message-4',
        },
        {
          listingId: 'item-5',
          title: 'Poster Tube',
          imageUrl: 'tube.png',
          state: 'unavailable',
          latestContextMessageId: 'message-5',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        body: 'Lamp update',
        createdAt: '2026-03-29T12:00:00.000Z',
      },
      {
        _id: 'message-3',
        senderClerkUserId: 'system',
        body: 'Offer accepted for the fridge.',
        createdAt: '2026-03-29T12:10:00.000Z',
      },
      {
        _id: 'message-4',
        senderClerkUserId: 'system',
        body: 'Helmet sale completed.',
        createdAt: '2026-03-29T12:20:00.000Z',
      },
      {
        _id: 'message-5',
        senderClerkUserId: 'seller-1',
        body: 'The poster tube is no longer available.',
        createdAt: '2026-03-29T12:30:00.000Z',
      },
    ],
  });

  render(<ChatThreadPage />);

  const scrollIntoViewMock = window.HTMLElement.prototype.scrollIntoView;
  scrollIntoViewMock.mockClear();

  fireEvent.click(await screen.findByRole('button', { name: /bike helmet\. completed here\./i }));

  expect(scrollIntoViewMock).toHaveBeenCalled();
  expect(screen.queryByTestId('composer-item-context')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open item/i })).toHaveAttribute('href', '/items/item-4');
  expect(screen.getByText('Purchased')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: 'Still good for the lamp?' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));

  await waitFor(() => {
    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      senderClerkUserId: 'buyer-1',
      body: 'Still good for the lamp?',
      attachedListingId: null,
    });
  });
});

test('unavailable chips update the item details card while also jumping to the latest message context', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 2,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
        },
        {
          listingId: 'item-5',
          title: 'Poster Tube',
          imageUrl: 'tube.png',
          state: 'unavailable',
          latestContextMessageId: 'message-5',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
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
        body: 'Lamp update',
        createdAt: '2026-03-29T12:00:00.000Z',
      },
      {
        _id: 'message-5',
        senderClerkUserId: 'seller-1',
        body: 'The poster tube is no longer available.',
        createdAt: '2026-03-29T12:30:00.000Z',
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
        pickupHubId: 'library-west',
        itemLocation: 'Library West',
        itemDescription: 'Matte black desk lamp with an adjustable neck for late-night study sessions.',
        userPublishingID: 'seller-1',
      });
    }

    if (url === 'http://localhost:5000/items/item-5') {
      return jsonResponse({
        _id: 'item-5',
        itemName: 'Poster Tube',
        pickupHubId: 'reitz',
        itemLocation: 'Reitz Union',
        itemDescription: 'Rigid poster tube with a shoulder strap for studio transport.',
        userPublishingID: 'seller-1',
      });
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  render(<ChatThreadPage />);

  const scrollIntoViewMock = window.HTMLElement.prototype.scrollIntoView;
  scrollIntoViewMock.mockClear();

  fireEvent.click(await screen.findByRole('button', { name: /poster tube\. unavailable\./i }));

  expect(scrollIntoViewMock).toHaveBeenCalled();
  expect(screen.queryByTestId('composer-item-context')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /poster tube\. unavailable\./i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /desk lamp\. active\./i })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('link', { name: /open item/i })).toHaveAttribute('href', '/items/item-5');
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(await screen.findByText(/Rigid poster tube with a shoulder strap/i)).toBeInTheDocument();
});

test('threads without an active negotiated hub fall back to the listing original public hub', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: '',
      activePickupSpecifics: '',
      isMeetupHubLocked: false,
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
  expect(screen.getByText('The seller will add meetup specifics when they confirm the offer.')).toBeInTheDocument();
});

test('single-item threads do not render attached-item pills on messages', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activeItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
        latestContextMessageId: 'message-1',
      },
      linkedItemCount: 1,
      linkedItems: [
        {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
        },
      ],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: true,
      lastMessageText: 'Hi there',
      lastMessageAt: '2026-03-29T12:00:00.000Z',
      lastReadAtByUser: {
        'buyer-1': '2026-03-29T12:00:00.000Z',
      },
    },
    messages: [
      {
        _id: 'message-1',
        senderClerkUserId: 'seller-1',
        body: 'Hi there',
        createdAt: '2026-03-29T12:00:00.000Z',
        attachedItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
        },
      },
    ],
  });

  render(<ChatThreadPage />);

  await screen.findByRole('heading', { name: 'Seller One' });

  expect(screen.queryByTestId('message-attached-item-pill')).not.toBeInTheDocument();
});

test('accepted threads fall back to the listing current reserved hub when specifics exist but the hub id is missing', async () => {
  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: '',
      activePickupSpecifics: 'By the tables outside',
      isMeetupHubLocked: true,
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

test('polling refresh does not auto-scroll when the reader is away from the bottom', async () => {
  jest.useFakeTimers();
  mockGetConversationMessages.mockReset();
  mockGetConversationMessages
    .mockResolvedValueOnce({
      conversation: {
        _id: 'conversation-1',
        participantIds: ['buyer-1', 'seller-1'],
        activeListingId: 'item-1',
        activeItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-1',
        },
        linkedItemCount: 1,
        linkedItems: [
          {
            listingId: 'item-1',
            title: 'Desk Lamp',
            imageUrl: 'lamp.png',
            state: 'active',
            latestContextMessageId: 'message-1',
          },
        ],
        activePickupHubId: 'reitz',
        activePickupSpecifics: 'Meet outside the food court doors.',
        isMeetupHubLocked: true,
        lastMessageText: 'Hi there',
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
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
    })
    .mockResolvedValueOnce({
      conversation: {
        _id: 'conversation-1',
        participantIds: ['buyer-1', 'seller-1'],
        activeListingId: 'item-1',
        activeItem: {
          listingId: 'item-1',
          title: 'Desk Lamp',
          imageUrl: 'lamp.png',
          state: 'active',
          latestContextMessageId: 'message-2',
        },
        linkedItemCount: 1,
        linkedItems: [
          {
            listingId: 'item-1',
            title: 'Desk Lamp',
            imageUrl: 'lamp.png',
            state: 'active',
            latestContextMessageId: 'message-2',
          },
        ],
        activePickupHubId: 'reitz',
        activePickupSpecifics: 'Meet outside the food court doors.',
        isMeetupHubLocked: true,
        lastMessageText: 'New reply',
        lastMessageAt: '2026-03-29T12:10:00.000Z',
        lastReadAtByUser: {
          'buyer-1': '2026-03-29T12:00:00.000Z',
        },
      },
      messages: [
        {
          _id: 'message-1',
          senderClerkUserId: 'seller-1',
          body: 'Hi there',
          createdAt: '2026-03-29T12:00:00.000Z',
        },
        {
          _id: 'message-2',
          senderClerkUserId: 'seller-1',
          body: 'New reply',
          createdAt: '2026-03-29T12:10:00.000Z',
        },
      ],
    });

  render(<ChatThreadPage />);

  expect(await screen.findByText('Hi there')).toBeInTheDocument();

  const scrollIntoViewMock = window.HTMLElement.prototype.scrollIntoView;
  const scrollToMock = window.HTMLElement.prototype.scrollTo;
  const scrollRegion = screen.getByTestId('thread-messages-scroll-region');

  Object.defineProperty(scrollRegion, 'scrollHeight', {
    configurable: true,
    value: 800,
  });
  Object.defineProperty(scrollRegion, 'clientHeight', {
    configurable: true,
    value: 200,
  });
  Object.defineProperty(scrollRegion, 'scrollTop', {
    configurable: true,
    value: 0,
    writable: true,
  });

  scrollIntoViewMock.mockClear();
  scrollToMock.mockClear();

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  expect(await screen.findByText('New reply')).toBeInTheDocument();
  expect(scrollIntoViewMock).not.toHaveBeenCalled();
  expect(scrollToMock).not.toHaveBeenCalled();

  jest.useRealTimers();
});

test('seller can update meetup specifics while the accepted hub stays locked', async () => {
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
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'I will wait by the benches.',
      isMeetupHubLocked: true,
      lastMessageText: 'Meetup details updated to Reitz Union. Specifics: I will wait by the benches.',
      lastMessageAt: '2026-03-29T13:10:00.000Z',
      lastReadAtByUser: {
        'seller-1': '2026-03-29T13:10:00.000Z',
      },
    },
    systemMessage: {
      _id: 'message-pickup-update',
      senderClerkUserId: 'system',
      body: 'Meetup details updated to Reitz Union. Specifics: I will wait by the benches.',
      createdAt: '2026-03-29T13:10:00.000Z',
      attachedItem: {
        listingId: 'item-1',
        title: 'Desk Lamp',
        imageUrl: 'lamp.png',
        state: 'active',
      },
    },
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /edit meetup details/i }));
  expect(screen.getByText(/meetup hub is locked after acceptance/i)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /reitz union/i })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/meetup specifics/i), {
    target: { value: 'I will wait by the benches.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /save meetup details/i }));

  await waitFor(() => {
    expect(mockUpdateConversationPickup).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      requesterClerkUserId: 'seller-1',
      pickupHubId: 'reitz',
      pickupSpecifics: 'I will wait by the benches.',
    });
  });

  expect(await screen.findByText('Reitz Union')).toBeInTheDocument();
  expect(screen.getByText(/meetup details updated to reitz union/i)).toBeInTheDocument();
});

test('seller can still change the meetup hub before acceptance even if specifics are already filled in', async () => {
  setClerkState({
    isSignedIn: true,
    user: {
      id: 'seller-1',
    },
  });

  mockGetConversationMessages.mockResolvedValue({
    conversation: {
      _id: 'conversation-1',
      participantIds: ['buyer-1', 'seller-1'],
      activeListingId: 'item-1',
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Meet outside the food court doors.',
      isMeetupHubLocked: false,
      lastMessageText: 'Still planning.',
      lastMessageAt: '2026-03-29T13:00:00.000Z',
      lastReadAtByUser: {
        'seller-1': '2026-03-29T13:00:00.000Z',
      },
    },
    messages: [],
  });

  render(<ChatThreadPage />);

  fireEvent.click(await screen.findByRole('button', { name: /edit meetup details/i }));

  expect(screen.queryByText(/meetup hub is locked after acceptance/i)).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /reitz union/i })).not.toBeDisabled();
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
