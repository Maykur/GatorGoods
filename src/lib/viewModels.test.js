import {
  formatListingStatusLabel,
  formatPaymentMethodLabel,
  formatPercentLabel,
  formatPriceLabel,
  groupOffersByListing,
  normalizeCategory,
  normalizeListingStatus,
  toOfferCardViewModel,
  toConversationPreviewViewModel,
  toListingCardViewModel,
  toProfileHeaderViewModel,
  toTrustMetricsViewModel,
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
    status: 'active',
    statusLabel: 'Active',
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
    bannerUrl: '',
    bio: '',
    instagramUrl: '',
    linkedinUrl: '',
    ufVerified: false,
    ratingLabel: '4.5/5',
    listingCount: 1,
    favoritesCount: 2,
    isOwner: true,
  });
});

test('helpers preserve stable fallbacks', () => {
  expect(normalizeCategory('')).toBe('Miscellaneous');
  expect(normalizeListingStatus('unknown')).toBe('active');
  expect(formatListingStatusLabel('reserved')).toBe('Reserved');
  expect(formatPaymentMethodLabel('gatorgoodsEscrow')).toBe('GatorGoods escrow');
  expect(formatPercentLabel(undefined)).toBe('No data yet');
  expect(formatPriceLabel('$45')).toBe('$45');
});

test('toTrustMetricsViewModel normalizes overall and percent-based trust fields', () => {
  expect(
    toTrustMetricsViewModel({
      profile: {
        profileRating: 4.3,
        profileTotalRating: 9,
        trustMetrics: {
          reliability: 92.1,
          accuracy: 88.2,
          responsiveness: 100,
          safety: 81.4,
        },
      },
    })
  ).toEqual({
    overallRatingLabel: '4.3/5',
    totalRatings: 9,
    reliabilityLabel: '92%',
    accuracyLabel: '88%',
    responsivenessLabel: '100%',
    safetyLabel: '81%',
  });
});

test('toOfferCardViewModel combines offer, listing, and profile context', () => {
  expect(
    toOfferCardViewModel(
      {
        _id: 'offer-1',
        listingId: 'item-1',
        buyerClerkUserId: 'buyer-1',
        sellerClerkUserId: 'seller-1',
        offeredPrice: 45,
        meetupLocation: 'Reitz Union',
        meetupWindow: 'Fri 2:00 PM - 3:00 PM',
        paymentMethod: 'cash',
        message: 'Can pick up after class.',
        status: 'pending',
        conversationId: 'conversation-1',
      },
      {
        listing: {
          _id: 'item-1',
          itemName: 'Mini Fridge',
          itemCost: '50',
          itemCondition: 'Good',
          itemLocation: 'Reitz Union',
          itemCat: 'Home & Garden',
          userPublishingName: 'Seller One',
          status: 'reserved',
        },
        buyerProfile: {
          profile: {
            profileName: 'Buyer One',
            profileRating: 4.1,
            profileTotalRating: 3,
            trustMetrics: {
              reliability: 80,
            },
          },
        },
        sellerProfile: {
          profile: {
            profileName: 'Seller One',
            profileRating: 4.7,
          },
        },
      }
    )
  ).toEqual({
    id: 'offer-1',
    listingId: 'item-1',
    listingTitle: 'Mini Fridge',
    listingStatus: 'reserved',
    listingStatusLabel: 'Reserved',
    buyerId: 'buyer-1',
    buyerName: 'Buyer One',
    sellerId: 'seller-1',
    sellerName: 'Seller One',
    offeredPrice: 45,
    offeredPriceLabel: '$45',
    meetupLocation: 'Reitz Union',
    meetupWindow: 'Fri 2:00 PM - 3:00 PM',
    paymentMethod: 'cash',
    paymentMethodLabel: 'Cash',
    message: 'Can pick up after class.',
    status: 'pending',
    conversationId: 'conversation-1',
    buyerTrust: {
      overallRatingLabel: '4.1/5',
      totalRatings: 3,
      reliabilityLabel: '80%',
      accuracyLabel: 'No data yet',
      responsivenessLabel: 'No data yet',
      safetyLabel: 'No data yet',
    },
    sellerTrust: {
      overallRatingLabel: '4.7/5',
      totalRatings: 0,
      reliabilityLabel: 'No data yet',
      accuracyLabel: 'No data yet',
      responsivenessLabel: 'No data yet',
      safetyLabel: 'No data yet',
    },
  });
});

test('groupOffersByListing groups normalized offers under each listing', () => {
  expect(
    groupOffersByListing(
      [
        {
          _id: 'offer-1',
          listingId: 'item-1',
          buyerClerkUserId: 'buyer-1',
          sellerClerkUserId: 'seller-1',
          offeredPrice: 25,
          meetupLocation: 'Plaza',
          meetupWindow: 'Tomorrow',
          paymentMethod: 'cash',
          status: 'pending',
        },
      ],
      {
        'item-1': {
          _id: 'item-1',
          itemName: 'Desk Lamp',
          status: 'active',
        },
      }
    )
  ).toEqual({
    'item-1': {
      listingId: 'item-1',
      listingTitle: 'Desk Lamp',
      listingStatus: 'active',
      listingStatusLabel: 'Active',
      offers: [
        expect.objectContaining({
          id: 'offer-1',
          listingTitle: 'Desk Lamp',
          offeredPriceLabel: '$25',
        }),
      ],
    },
  });
});
