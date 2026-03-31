import {
  formatPriceLabel,
  normalizeCategory,
  toConversationPreviewViewModel,
  toListingCardViewModel,
  toProfileHeaderViewModel,
} from './viewModels';

test('toListingCardViewModel normalizes core listing fields', () => {
  expect(
    toListingCardViewModel({
      _id: 'item-1',
      itemName: 'Desk Lamp',
      itemCost: '20',
      itemCondition: 'Good',
      itemLocation: 'Library West',
      itemPicture: 'lamp.png',
      itemCat: '',
      userPublishingName: '',
    })
  ).toEqual({
    id: 'item-1',
    title: 'Desk Lamp',
    priceLabel: '$20',
    condition: 'Good',
    location: 'Library West',
    imageUrl: 'lamp.png',
    category: 'Miscellaneous',
    sellerName: 'GatorGoods Seller',
  });
});

test('toConversationPreviewViewModel marks conversations unread when last message is newer than last read', () => {
  const preview = toConversationPreviewViewModel(
    {
      _id: 'conversation-1',
      lastMessageText: 'Still available?',
      lastMessageAt: '2026-03-30T10:00:00.000Z',
      lastReadAtByUser: {
        buyer: '2026-03-30T09:00:00.000Z',
      },
      otherParticipantId: 'seller-1',
    },
    {
      profile: {
        profileName: 'Seller One',
      },
    },
    {
      itemName: 'Desk Lamp',
    },
    'buyer'
  );

  expect(preview.participantName).toBe('Seller One');
  expect(preview.listingName).toBe('Desk Lamp');
  expect(preview.lastMessageText).toBe('Still available?');
  expect(preview.isUnread).toBe(true);
});

test('toProfileHeaderViewModel computes counts and owner state', () => {
  expect(
    toProfileHeaderViewModel(
      {
        profile: {
          profileID: 'seller-1',
          profileName: 'Seller One',
          profilePicture: '',
          profileRating: 4.5,
          profileFavorites: ['item-1', 'item-2'],
        },
      },
      [{_id: 'item-1'}],
      'seller-1'
    )
  ).toEqual({
    id: 'seller-1',
    displayName: 'Seller One',
    avatarUrl: '',
    ratingLabel: '4.5/5',
    listingCount: 1,
    favoritesCount: 2,
    isOwner: true,
  });
});

test('helpers preserve stable fallbacks', () => {
  expect(normalizeCategory('')).toBe('Miscellaneous');
  expect(formatPriceLabel('$45')).toBe('$45');
});
