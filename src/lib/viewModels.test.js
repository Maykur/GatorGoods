import {
  formatConversationTimestamp,
  formatListingStatusLabel,
  formatPaymentMethodLabel,
  formatPercentLabel,
  formatPriceLabel,
  getListingActualPickup,
  groupOffersByListing,
  normalizeCategory,
  normalizeListingStatus,
  toOfferCardViewModel,
  toConversationPreviewViewModel,
  toListingCardViewModel,
  toProfileHeaderViewModel,
  toTrustMetricsViewModel,
} from './viewModels';
import {
  APPROVED_PICKUP_HUBS,
  deriveListingPickupFields,
  deriveOfferPickupFields,
  getPickupHubById,
} from './pickupHubs';

test('toListingCardViewModel normalizes core listing fields', () => {
  expect(
    toListingCardViewModel({
      _id: 'item-1',
      itemName: 'Desk Lamp',
      itemCost: '20',
      itemCondition: 'Good',
      originalPickupHubId: 'library-west',
      originalPickupArea: 'Historic Core',
      originalItemLocation: 'Library West',
      pickupHubId: 'library-west',
      pickupArea: 'Historic Core',
      itemLocation: 'Old Label',
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
    pickupHubId: 'library-west',
    pickupArea: 'Historic Core',
    imageUrl: 'lamp.png',
    category: 'Miscellaneous',
    sellerName: 'GatorGoods Seller',
    status: 'active',
    statusLabel: 'Active',
  });
});

test('toListingCardViewModel prefers original public pickup fields when actual pickup changes later', () => {
  expect(
    toListingCardViewModel({
      _id: 'item-2',
      itemName: 'Monitor',
      itemCost: '60',
      itemCondition: 'Good',
      originalPickupHubId: 'library-west',
      originalPickupArea: 'Historic Core',
      originalItemLocation: 'Library West',
      pickupHubId: 'plaza-americas',
      pickupArea: 'Historic Core',
      itemLocation: 'Plaza of the Americas',
      itemPicture: 'monitor.png',
    })
  ).toEqual(
    expect.objectContaining({
      location: 'Library West',
      pickupHubId: 'library-west',
      pickupArea: 'Historic Core',
    })
  );

  expect(
    getListingActualPickup({
      pickupHubId: 'plaza-americas',
      pickupArea: 'Historic Core',
      itemLocation: 'Plaza of the Americas',
    })
  ).toEqual({
    pickupHubId: 'plaza-americas',
    pickupArea: 'Historic Core',
    location: 'Plaza of the Americas',
  });
});

test('toListingCardViewModel prefers feed image URLs over raw stored image data', () => {
  expect(
    toListingCardViewModel({
      _id: 'item-3',
      itemName: 'Desk Lamp',
      itemCost: '20',
      itemCondition: 'Good',
      originalPickupHubId: 'library-west',
      originalPickupArea: 'Historic Core',
      originalItemLocation: 'Library West',
      itemPicture: 'data:image/png;base64,abc123',
      itemPictureUrl: 'http://localhost:5000/items/item-3/image',
      userPublishingName: 'Seller One',
    })
  ).toEqual(
    expect.objectContaining({
      imageUrl: 'http://localhost:5000/items/item-3/image',
    })
  );
});

test('toConversationPreviewViewModel marks conversations unread when last message is newer than last read', () => {
  const preview = toConversationPreviewViewModel(
    {
      _id: 'conversation-1',
      otherParticipant: {
        id: 'seller-1',
        name: 'Seller One',
        avatarUrl: 'seller.png',
      },
      activeItem: {
        title: 'Desk Lamp',
      },
      linkedItemCount: 3,
      linkedItems: [
        {
          title: 'Desk Lamp',
          relationshipRole: 'buying',
          state: 'active',
        },
        {
          title: 'Mini Fridge',
          relationshipRole: 'selling',
          state: 'pending',
        },
        {
          title: 'Poster Tube',
          relationshipRole: 'buying',
          state: 'unavailable',
        },
      ],
      lastMessageText: 'Still available?',
      lastMessageSenderClerkUserId: 'seller-1',
      lastMessageAt: '2026-03-30T10:00:00.000Z',
      lastReadAtByUser: {
        buyer: '2026-03-30T09:00:00.000Z',
      },
      otherParticipantId: 'seller-1',
    },
    'buyer'
  );

  expect(preview.participantName).toBe('Seller One');
  expect(preview.participantAvatarUrl).toBe('seller.png');
  expect(preview.listingName).toBe('Desk Lamp');
  expect(preview.activeItemTitle).toBe('Desk Lamp');
  expect(preview.fullActiveItemTitle).toBe('Desk Lamp');
  expect(preview.itemTitles).toEqual(['Desk Lamp', 'Mini Fridge', 'Poster Tube']);
  expect(preview.itemTitlesLabel).toBe('Desk Lamp, Mini Fridge, Poster Tube');
  expect(preview.fullItemTitlesLabel).toBe('Desk Lamp, Mini Fridge, Poster Tube');
  expect(preview.linkedItemCount).toBe(3);
  expect(preview.extraItemCount).toBe(0);
  expect(preview.lastMessageText).toBe('Still available?');
  expect(preview.lastMessagePreviewText).toBe('Seller: Still available?');
  expect(preview.fullLastMessagePreviewText).toBe('Seller: Still available?');
  expect(preview.hasSellingItems).toBe(true);
  expect(preview.pendingItemCount).toBe(1);
  expect(preview.isUnread).toBe(true);
});

test('toConversationPreviewViewModel truncates item titles and long message previews for inbox cards', () => {
  const preview = toConversationPreviewViewModel(
    {
      _id: 'conversation-2',
      otherParticipant: {
        id: 'seller-2',
        name: 'Alexandra Seller',
      },
      activeItem: {
        title: 'Extra Long Standing Lamp',
      },
      linkedItemCount: 3,
      linkedItems: [
        {
          title: 'Extra Long Standing Lamp',
          relationshipRole: 'buying',
          state: 'active',
        },
        {
          title: 'Ridiculously Wide Storage Ottoman',
          relationshipRole: 'buying',
          state: 'active',
        },
        {
          title: 'Mini Fridge with Freezer Shelf',
          relationshipRole: 'selling',
          state: 'pending',
        },
      ],
      lastMessageText: 'This is a much longer message preview than we want to show in the inbox card at once.',
      lastMessageSenderClerkUserId: 'seller-2',
      lastMessageAt: '2026-03-30T10:00:00.000Z',
      lastReadAtByUser: {
        buyer: '2026-03-30T10:00:00.000Z',
      },
    },
    'buyer'
  );

  expect(preview.itemTitles).toEqual([
    'Extra Long Standing Lamp',
    'Ridiculously Wide Stor...',
    'Mini Fridge with Freez...',
  ]);
  expect(preview.itemTitlesLabel).toBe(
    'Extra Long Standing Lamp, Ridiculously Wide Stor..., Mini Fridge with Freez...'
  );
  expect(preview.fullItemTitlesLabel).toBe(
    'Extra Long Standing Lamp, Ridiculously Wide Storage Ottoman, Mini Fridge with Freezer Shelf'
  );
  expect(preview.lastMessagePreviewText).toBe(
    'Alexandra: This is a much longer message preview than we want to show in...'
  );
  expect(preview.fullLastMessagePreviewText).toBe(
    'Alexandra: This is a much longer message preview than we want to show in the inbox card at once.'
  );
  expect(preview.lastMessagePreviewText.length).toBeLessThanOrEqual(75);
});

test('formatConversationTimestamp removes the year and seconds from inbox timestamps', () => {
  expect(formatConversationTimestamp('2026-03-30T22:05:45.000Z')).toMatch(/Mar/);
  expect(formatConversationTimestamp('2026-03-30T22:05:45.000Z')).not.toMatch(/2026/);
  expect(formatConversationTimestamp('2026-03-30T22:05:45.000Z')).not.toMatch(/:45/);
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
        meetupHubId: 'reitz',
        meetupArea: 'South Core',
        meetupLocation: 'Old Reitz Label',
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
    meetupHubId: 'reitz',
    meetupArea: 'South Core',
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

test('pickup hub helpers expose approved hubs and derive compatibility fields', () => {
  expect(APPROVED_PICKUP_HUBS).toHaveLength(9);
  expect(getPickupHubById('turlington-hall')).toEqual(
    expect.objectContaining({
      label: 'Turlington Hall',
      area: 'Historic Core',
      publicSafe: true,
    })
  );
  expect(
    deriveListingPickupFields({
      pickupHubId: 'marston',
    })
  ).toEqual({
    pickupHubId: 'marston',
    pickupArea: 'East Core',
    itemLocation: 'Marston Science Library',
  });
  expect(
    deriveOfferPickupFields({
      meetupLocation: 'Plaza',
    })
  ).toEqual({
    meetupHubId: 'plaza-americas',
    meetupArea: 'Historic Core',
    meetupLocation: 'Plaza of the Americas',
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
