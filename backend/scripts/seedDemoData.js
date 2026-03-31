const {faker} = require('@faker-js/faker');

const {
  clearDatabase,
  connectToDatabase,
  disconnectFromDatabase,
  models: {
    Conversation,
    Item,
    Message,
    Offer,
    Profile,
  },
} = require('../index');

const DEFAULT_SEED_TAG = 'gatorgoods-demo';
const DEFAULT_FAKER_SEED = 20260401;
const HOURS_TO_MS = 60 * 60 * 1000;
const CLERK_USERS_URL = 'https://api.clerk.com/v1/users';
const DEFAULT_PRESENTER_PICTURE =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80';

const PRESENTER_PROFILE_DEFAULTS = {
  profileName: 'Scott Knowles',
  profilePicture: DEFAULT_PRESENTER_PICTURE,
  profileBanner: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
  profileBio: 'Selling a polished mix of dorm and apartment essentials before summer move-out. I usually meet near Library West, Marston, or Heavener between classes.',
  instagramUrl: 'https://instagram.com/gatorgoods_demo',
  linkedinUrl: 'https://linkedin.com/in/gatorgoods-demo',
  ufVerified: true,
  profileRating: 4.9,
  profileTotalRating: 38,
  trustMetrics: {
    reliability: 97,
    accuracy: 95,
    responsiveness: 99,
    safety: 94,
  },
};

const BIO_VARIANTS = [
  'Usually replies between classes and can coordinate a same-day meetup.',
  'Happy to meet on campus if the timing lines up with class blocks.',
  'I keep my listings current and usually confirm pickup windows quickly.',
  'Most pickups happen around central campus after lab or club meetings.',
];

const OFFER_MESSAGE_VARIANTS = [
  'I can keep the handoff quick and easy.',
  'Happy to confirm a pickup window today.',
  'I can meet right after class if that helps.',
  'I can send a quick update before I head over.',
];

const MESSAGE_VARIANTS = [
  'I can bring exact cash if that is easiest.',
  'I can head over after my afternoon class.',
  'That timing works on my side.',
  'Thanks for the quick reply.',
  'I can meet near Library West or Reitz.',
  'I will message when I am walking over.',
];

const COMMUNITY_PROFILES = [
  {
    key: 'ava',
    profileID: 'demo_ava_morgan',
    profileName: 'Ava Morgan',
    profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'First-year student grabbing apartment basics before fall move-in.',
    instagramUrl: 'https://instagram.com/avamarketplace',
    linkedinUrl: '',
    profileRating: 4.7,
    profileTotalRating: 14,
    trustMetrics: {
      reliability: 91,
      accuracy: 92,
      responsiveness: 95,
      safety: 93,
    },
  },
  {
    key: 'ethan',
    profileID: 'demo_ethan_brooks',
    profileName: 'Ethan Brooks',
    profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Shopping for a few upgrades before next semester starts.',
    instagramUrl: '',
    linkedinUrl: '',
    profileRating: 4.5,
    profileTotalRating: 9,
    trustMetrics: {
      reliability: 88,
      accuracy: 90,
      responsiveness: 86,
      safety: 92,
    },
  },
  {
    key: 'leo',
    profileID: 'demo_leo_martinez',
    profileName: 'Leo Martinez',
    profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Engineering student rotating out electronics and commuting gear.',
    instagramUrl: 'https://instagram.com/leooncampus',
    linkedinUrl: 'https://linkedin.com/in/leomartinez-uf',
    profileRating: 4.8,
    profileTotalRating: 22,
    trustMetrics: {
      reliability: 96,
      accuracy: 94,
      responsiveness: 90,
      safety: 95,
    },
  },
  {
    key: 'jasmine',
    profileID: 'demo_jasmine_patel',
    profileName: 'Jasmine Patel',
    profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Leasing out my room and clearing extra apartment storage pieces.',
    instagramUrl: 'https://instagram.com/jaspateluf',
    linkedinUrl: '',
    profileRating: 4.9,
    profileTotalRating: 31,
    trustMetrics: {
      reliability: 98,
      accuracy: 97,
      responsiveness: 93,
      safety: 96,
    },
  },
  {
    key: 'noah',
    profileID: 'demo_noah_kim',
    profileName: 'Noah Kim',
    profilePicture: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Selling a few style and music extras after spring cleaning.',
    instagramUrl: 'https://instagram.com/noahkimuf',
    linkedinUrl: 'https://linkedin.com/in/noahkim-uf',
    profileRating: 4.6,
    profileTotalRating: 16,
    trustMetrics: {
      reliability: 90,
      accuracy: 89,
      responsiveness: 94,
      safety: 91,
    },
  },
  {
    key: 'priya',
    profileID: 'demo_priya_shah',
    profileName: 'Priya Shah',
    profilePicture: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Clearing family and hobby items from storage before summer travel.',
    instagramUrl: '',
    linkedinUrl: 'https://linkedin.com/in/priyashah-uf',
    profileRating: 4.8,
    profileTotalRating: 19,
    trustMetrics: {
      reliability: 95,
      accuracy: 93,
      responsiveness: 89,
      safety: 97,
    },
  },
  {
    key: 'mateo',
    profileID: 'demo_mateo_ruiz',
    profileName: 'Mateo Ruiz',
    profilePicture: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Graduating senior selling books and campus-ready accessories.',
    instagramUrl: 'https://instagram.com/mateo.market',
    linkedinUrl: 'https://linkedin.com/in/mateoruiz-uf',
    profileRating: 4.9,
    profileTotalRating: 27,
    trustMetrics: {
      reliability: 97,
      accuracy: 96,
      responsiveness: 92,
      safety: 95,
    },
  },
];

function defaultDependencies() {
  return {
    clearDatabase,
    models: {
      Conversation,
      Item,
      Message,
      Offer,
      Profile,
    },
  };
}

function trimEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseBooleanEnv(value) {
  return trimEnvValue(value).toLowerCase() === 'true';
}

function parseFakerSeed(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_FAKER_SEED;
}

function subtractHours(now, hoursAgo) {
  return new Date(now.getTime() - (hoursAgo * HOURS_TO_MS));
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

function sortedParticipantIds(participantIds = []) {
  return uniqueStrings(participantIds).sort();
}

function buildSeedConfigFromEnv(env = process.env) {
  return {
    demoUserEmail: trimEnvValue(env.DEMO_USER_EMAIL),
    demoUserId: trimEnvValue(env.DEMO_USER_ID),
    clerkSecretKey: trimEnvValue(env.CLERK_SECRET_KEY),
    fullReset: parseBooleanEnv(env.SEED_FULL_RESET),
    seedTag: trimEnvValue(env.SEED_TAG) || DEFAULT_SEED_TAG,
    fakerSeed: parseFakerSeed(env.FAKER_SEED),
    now: new Date(),
    presenterIdentity: null,
  };
}

function buildDisplayNameFromClerkUser(user = {}) {
  const firstName = trimEnvValue(user.firstName || user.first_name);
  const lastName = trimEnvValue(user.lastName || user.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  if (trimEnvValue(user.username)) {
    return user.username.trim();
  }

  const primaryEmailObject = user.primaryEmailAddress || user.primary_email_address || null;
  const primaryEmail = trimEnvValue(primaryEmailObject?.emailAddress || primaryEmailObject?.email_address);

  if (primaryEmail) {
    return primaryEmail;
  }

  const emailAddresses = Array.isArray(user.emailAddresses)
    ? user.emailAddresses
    : Array.isArray(user.email_addresses)
      ? user.email_addresses
      : [];
  const fallbackEmail = trimEnvValue(emailAddresses[0]?.emailAddress || emailAddresses[0]?.email_address);

  if (fallbackEmail) {
    return fallbackEmail;
  }

  return PRESENTER_PROFILE_DEFAULTS.profileName;
}

async function resolveClerkUserByEmail(
  email,
  {
    fetchImpl = global.fetch,
    clerkSecretKey = process.env.CLERK_SECRET_KEY,
  } = {}
) {
  const normalizedEmail = trimEnvValue(email);

  if (!normalizedEmail) {
    throw new Error('DEMO_USER_EMAIL must be set to resolve a Clerk user by email.');
  }

  if (!trimEnvValue(clerkSecretKey)) {
    throw new Error('CLERK_SECRET_KEY is required when DEMO_USER_EMAIL is set.');
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to resolve Clerk users by email.');
  }

  const requestUrl = new URL(CLERK_USERS_URL);
  requestUrl.searchParams.append('email_address[]', normalizedEmail);
  requestUrl.searchParams.set('limit', '1');

  const response = await fetchImpl(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const responseText = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`Clerk lookup failed (${response.status}): ${responseText || 'Unable to fetch user'}`);
  }

  const users = await response.json();
  const clerkUser = Array.isArray(users) ? users[0] : null;

  if (!clerkUser) {
    throw new Error(`No Clerk user was found for ${normalizedEmail}.`);
  }

  return {
    profileID: clerkUser.id,
    profileName: buildDisplayNameFromClerkUser(clerkUser),
    profilePicture: trimEnvValue(clerkUser.imageUrl || clerkUser.image_url) || PRESENTER_PROFILE_DEFAULTS.profilePicture,
    source: 'clerk-email',
    email: normalizedEmail,
  };
}

async function resolvePresenterIdentity(config, {fetchImpl = global.fetch} = {}) {
  if (config.demoUserEmail) {
    return resolveClerkUserByEmail(config.demoUserEmail, {
      fetchImpl,
      clerkSecretKey: config.clerkSecretKey,
    });
  }

  if (config.demoUserId) {
    return {
      profileID: config.demoUserId,
      profileName: PRESENTER_PROFILE_DEFAULTS.profileName,
      profilePicture: PRESENTER_PROFILE_DEFAULTS.profilePicture,
      source: 'demo-user-id',
      email: '',
    };
  }

  return {
    profileID: 'demo_seller',
    profileName: PRESENTER_PROFILE_DEFAULTS.profileName,
    profilePicture: PRESENTER_PROFILE_DEFAULTS.profilePicture,
    source: 'fallback',
    email: '',
  };
}

function addFiller(baseText, variants) {
  return `${baseText} ${faker.helpers.arrayElement(variants)}`.trim();
}

function buildSeedDataset(config) {
  faker.seed(config.fakerSeed);

  const now = config.now instanceof Date ? config.now : new Date(config.now || Date.now());
  const presenterIdentity = config.presenterIdentity || {
    profileID: config.demoUserId || 'demo_seller',
    profileName: PRESENTER_PROFILE_DEFAULTS.profileName,
    profilePicture: PRESENTER_PROFILE_DEFAULTS.profilePicture,
    source: 'fallback',
  };

  const presenterProfile = {
    key: 'presenter',
    profileID: presenterIdentity.profileID,
    profileName: presenterIdentity.profileName,
    profilePicture: presenterIdentity.profilePicture || PRESENTER_PROFILE_DEFAULTS.profilePicture,
    profileBanner: PRESENTER_PROFILE_DEFAULTS.profileBanner,
    profileBio: PRESENTER_PROFILE_DEFAULTS.profileBio,
    instagramUrl: PRESENTER_PROFILE_DEFAULTS.instagramUrl,
    linkedinUrl: PRESENTER_PROFILE_DEFAULTS.linkedinUrl,
    ufVerified: true,
    profileRating: PRESENTER_PROFILE_DEFAULTS.profileRating,
    profileTotalRating: PRESENTER_PROFILE_DEFAULTS.profileTotalRating,
    trustMetrics: {...PRESENTER_PROFILE_DEFAULTS.trustMetrics},
    seedTag: null,
  };

  const communityProfiles = COMMUNITY_PROFILES.map((profile) => ({
    ...profile,
    profileBio: addFiller(profile.profileBio, BIO_VARIANTS),
    ufVerified: true,
    seedTag: config.seedTag,
  }));

  const profilesByKey = {
    presenter: presenterProfile,
  };

  communityProfiles.forEach((profile) => {
    profilesByKey[profile.key] = profile;
  });

  const listings = [
    {
      key: 'desk-lamp',
      ownerKey: 'presenter',
      itemName: 'Desk Lamp',
      itemCost: '28',
      itemCondition: 'Good',
      itemLocation: 'Library West',
      itemPicture: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'A bright desk lamp that makes late-night study sessions easier without taking much desk space.',
      itemDetails: 'Warm bulb included and the neck still pivots smoothly. Pickup works best near Library West or Marston.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 5),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge',
      ownerKey: 'presenter',
      itemName: 'Mini Fridge',
      itemCost: '70',
      itemCondition: 'Fair',
      itemLocation: 'Heavener Hall',
      itemPicture: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Compact dorm mini fridge that still cools quickly and fits under a lofted bed.',
      itemDetails: 'Some cosmetic wear on the door, but it runs reliably. Already reserved for pickup tonight.',
      itemCat: 'Home & Garden',
      status: 'reserved',
      date: subtractHours(now, 22),
      seedTag: config.seedTag,
    },
    {
      key: 'headphones',
      ownerKey: 'leo',
      itemName: 'Noise-Cancelling Headphones',
      itemCost: '85',
      itemCondition: 'Good',
      itemLocation: 'Reitz Union',
      itemPicture: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Over-ear Bluetooth headphones with the case and charger included.',
      itemDetails: 'Sold recently and still includes the case and charging cable.',
      itemCat: 'Electronics & Computers',
      status: 'sold',
      date: subtractHours(now, 44),
      seedTag: config.seedTag,
    },
    {
      key: 'scooter',
      ownerKey: 'leo',
      itemName: 'Campus Commuter Scooter',
      itemCost: '120',
      itemCondition: 'Good',
      itemLocation: 'Southwest Recreation Center',
      itemPicture: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Foldable electric scooter that is easy to stash in an apartment or carry into class.',
      itemDetails: 'Battery lasts about a week of short campus trips and the charger is included.',
      itemCat: 'Vehicles',
      status: 'active',
      date: subtractHours(now, 18),
      seedTag: config.seedTag,
    },
    {
      key: 'sublease-room',
      ownerKey: 'jasmine',
      itemName: 'Summer Sublease Near Sorority Row',
      itemCost: '780',
      itemCondition: 'Excellent',
      itemLocation: 'Sorority Row',
      itemPicture: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Private furnished room in a 4x4 with in-unit laundry and a quick bike ride to campus.',
      itemDetails: 'Available May through July with parking and utilities mostly included. Great for internships or summer classes.',
      itemCat: 'Property Rentals',
      status: 'active',
      date: subtractHours(now, 12),
      seedTag: config.seedTag,
    },
    {
      key: 'storage-drawers',
      ownerKey: 'jasmine',
      itemName: 'Under-Bed Storage Drawers',
      itemCost: '35',
      itemCondition: 'Good',
      itemLocation: 'Midtown',
      itemPicture: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Set of clear rolling drawers that fit under a dorm bed or apartment guest bed.',
      itemDetails: 'Reserved for pickup later this week.',
      itemCat: 'Miscellaneous',
      status: 'reserved',
      date: subtractHours(now, 28),
      seedTag: config.seedTag,
    },
    {
      key: 'denim-jacket',
      ownerKey: 'noah',
      itemName: 'Vintage Denim Jacket',
      itemCost: '42',
      itemCondition: 'Good',
      itemLocation: 'Plaza of the Americas',
      itemPicture: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'A broken-in denim jacket with room for a hoodie underneath on cooler Gainesville nights.',
      itemDetails: 'Fits like a roomy medium and has no tears or missing buttons.',
      itemCat: 'Apparel & Accessories',
      status: 'active',
      date: subtractHours(now, 20),
      seedTag: config.seedTag,
    },
    {
      key: 'guitar',
      ownerKey: 'noah',
      itemName: 'Beginner Acoustic Guitar',
      itemCost: '95',
      itemCondition: 'Good',
      itemLocation: 'Norman Hall',
      itemPicture: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Full-size acoustic guitar that is perfect for learning a few songs before summer.',
      itemDetails: 'Comes with a soft case, tuner, and extra picks.',
      itemCat: 'Entertainment & Hobbies',
      status: 'active',
      date: subtractHours(now, 24),
      seedTag: config.seedTag,
    },
    {
      key: 'stroller-organizer',
      ownerKey: 'priya',
      itemName: 'Stroller Organizer Caddy',
      itemCost: '18',
      itemCondition: 'Like New',
      itemLocation: 'Shands',
      itemPicture: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Keeps bottles, snacks, and keys easy to reach on stroller walks around campus.',
      itemDetails: 'Only used a few weekends and the insulated cup holders are still spotless.',
      itemCat: 'Family',
      status: 'active',
      date: subtractHours(now, 9),
      seedTag: config.seedTag,
    },
    {
      key: 'board-game',
      ownerKey: 'priya',
      itemName: 'Strategy Board Game Set',
      itemCost: '22',
      itemCondition: 'Good',
      itemLocation: 'Broward Hall',
      itemPicture: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'A well-kept game-night favorite with all pieces accounted for.',
      itemDetails: 'Sold recently after a few campus game nights.',
      itemCat: 'Entertainment & Hobbies',
      status: 'sold',
      date: subtractHours(now, 40),
      seedTag: config.seedTag,
    },
    {
      key: 'textbook-bundle',
      ownerKey: 'mateo',
      itemName: 'Organic Chemistry Textbook Bundle',
      itemCost: '55',
      itemCondition: 'Fair',
      itemLocation: 'Marston Science Library',
      itemPicture: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Lecture text, solution manual, and study guide bundle for a cheaper semester setup.',
      itemDetails: 'Highlighted in a few sections, but still perfect for practice problems and review sessions.',
      itemCat: 'Miscellaneous',
      status: 'active',
      date: subtractHours(now, 15),
      seedTag: config.seedTag,
    },
    {
      key: 'backpack',
      ownerKey: 'mateo',
      itemName: 'North Campus Backpack',
      itemCost: '34',
      itemCondition: 'Good',
      itemLocation: 'Little Hall',
      itemPicture: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Laptop-ready backpack with a clean main compartment and plenty of organization pockets.',
      itemDetails: 'Comfortable for long walks across campus and still looks sharp for internships.',
      itemCat: 'Apparel & Accessories',
      status: 'active',
      date: subtractHours(now, 30),
      seedTag: config.seedTag,
    },
  ];

  const conversations = [
    {
      key: 'conv-desk-lamp-ava',
      listingKey: 'desk-lamp',
      participantKeys: ['presenter', 'ava'],
      messages: [
        {
          senderKey: 'ava',
          body: addFiller('Hi! I just sent an offer on the lamp and could meet near Library West after my chem lecture.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 30),
        },
        {
          senderKey: 'presenter',
          body: 'That should work. I am on campus most of the afternoon and can keep it packed up.',
          createdAt: subtractHours(now, 29.5),
        },
        {
          senderKey: 'ava',
          body: 'Perfect. If you still have it, I can head over later today.',
          createdAt: subtractHours(now, 2.4),
        },
        {
          senderKey: 'ava',
          body: addFiller('I am still interested and can confirm within ten minutes once you reply.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 1.8),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 29.5,
        ava: 1.8,
      },
    },
    {
      key: 'conv-desk-lamp-ethan',
      listingKey: 'desk-lamp',
      participantKeys: ['presenter', 'ethan'],
      messages: [
        {
          senderKey: 'ethan',
          body: addFiller('Sent an offer on the lamp. Could we do pickup at Marston tomorrow around lunch?', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 20),
        },
        {
          senderKey: 'presenter',
          body: 'Tomorrow around lunch is workable. I will be nearby after my morning class.',
          createdAt: subtractHours(now, 19.6),
        },
        {
          senderKey: 'ethan',
          body: 'Sounds good. Let me know if the timing shifts.',
          createdAt: subtractHours(now, 19.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 19.1,
        ethan: 19.1,
      },
    },
    {
      key: 'conv-desk-lamp-leo',
      listingKey: 'desk-lamp',
      participantKeys: ['presenter', 'leo'],
      messages: [
        {
          senderKey: 'leo',
          body: 'I sent an offer and could meet near the Reitz right after my design review.',
          createdAt: subtractHours(now, 23),
        },
        {
          senderKey: 'presenter',
          body: addFiller('Thanks for the offer. Reitz could work if the lamp is still available tomorrow afternoon.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 22.4),
        },
        {
          senderKey: 'leo',
          body: 'Great. Keep me posted if one of the earlier offers falls through.',
          createdAt: subtractHours(now, 21.9),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 21.9,
        leo: 21.9,
      },
    },
    {
      key: 'conv-mini-fridge-noah',
      listingKey: 'mini-fridge',
      participantKeys: ['presenter', 'noah'],
      messages: [
        {
          senderKey: 'noah',
          body: 'Thanks for accepting the fridge offer. I can swing by Heavener after 6:00 tonight.',
          createdAt: subtractHours(now, 14),
        },
        {
          senderKey: 'presenter',
          body: 'Perfect. I already wiped it down and can meet outside the garage entrance.',
          createdAt: subtractHours(now, 13.7),
        },
        {
          senderKey: 'noah',
          body: addFiller('Awesome. I will bring exact cash and message when I am heading over.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 13.4),
        },
        {
          senderKey: 'presenter',
          body: 'Sounds good. I will have it unplugged and ready by then.',
          createdAt: subtractHours(now, 12.9),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 12.9,
        noah: 12.9,
      },
    },
    {
      key: 'conv-mini-fridge-jasmine',
      listingKey: 'mini-fridge',
      participantKeys: ['presenter', 'jasmine'],
      messages: [
        {
          senderKey: 'jasmine',
          body: 'I sent an offer in case the fridge opens back up. I can pay through Venmo at pickup.',
          createdAt: subtractHours(now, 17),
        },
        {
          senderKey: 'presenter',
          body: 'Thanks for sending it over. I already promised it to another buyer, but I wanted to keep you posted quickly.',
          createdAt: subtractHours(now, 16.6),
        },
        {
          senderKey: 'jasmine',
          body: 'No worries at all. Appreciate the quick update.',
          createdAt: subtractHours(now, 16.2),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 16.2,
        jasmine: 16.2,
      },
    },
    {
      key: 'conv-sublease-presenter',
      listingKey: 'sublease-room',
      participantKeys: ['presenter', 'jasmine'],
      messages: [
        {
          senderKey: 'presenter',
          body: 'I sent an offer on the summer sublease and wanted to ask whether parking is still available.',
          createdAt: subtractHours(now, 11),
        },
        {
          senderKey: 'jasmine',
          body: 'Yes, there is one spot open. I can also share a quick video walkthrough later today.',
          createdAt: subtractHours(now, 10.7),
        },
        {
          senderKey: 'presenter',
          body: addFiller('That would be helpful. I am mostly comparing commute time and move-in flexibility.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 10.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 10.1,
        jasmine: 10.1,
      },
    },
    {
      key: 'conv-backpack-presenter',
      listingKey: 'backpack',
      participantKeys: ['presenter', 'mateo'],
      messages: [
        {
          senderKey: 'presenter',
          body: addFiller('Sent an offer on the backpack. Could pickup happen near Little Hall after 3:00 tomorrow?', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 27),
        },
        {
          senderKey: 'mateo',
          body: 'Tomorrow works, but I already have another buyer lined up first. I will let you know if that changes.',
          createdAt: subtractHours(now, 26.4),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 26.4,
        mateo: 26.4,
      },
    },
    {
      key: 'conv-stroller-ava',
      listingKey: 'stroller-organizer',
      participantKeys: ['ava', 'priya'],
      messages: [
        {
          senderKey: 'ava',
          body: 'I sent an offer on the stroller organizer. Could pickup happen near Shands tomorrow afternoon?',
          createdAt: subtractHours(now, 8),
        },
        {
          senderKey: 'priya',
          body: 'Tomorrow afternoon works. The first offer was a little low, but I am open to another one.',
          createdAt: subtractHours(now, 7.6),
        },
        {
          senderKey: 'ava',
          body: addFiller('Thanks. I sent an updated offer with a slightly better price and can be flexible on timing.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 7.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        ava: 7.1,
        priya: 7.1,
      },
    },
  ];

  const offers = [
    {
      key: 'offer-desk-lamp-ava',
      listingKey: 'desk-lamp',
      buyerKey: 'ava',
      conversationKey: 'conv-desk-lamp-ava',
      offeredPrice: 24,
      meetupLocation: 'Library West',
      meetupWindow: 'Today 4:30 PM - 5:00 PM',
      paymentMethod: 'cash',
      message: addFiller('I can pick this up fast if it is still available today.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 30),
    },
    {
      key: 'offer-desk-lamp-ethan',
      listingKey: 'desk-lamp',
      buyerKey: 'ethan',
      conversationKey: 'conv-desk-lamp-ethan',
      offeredPrice: 25,
      meetupLocation: 'Marston Science Library',
      meetupWindow: 'Tomorrow 12:15 PM - 12:45 PM',
      paymentMethod: 'externalApp',
      message: addFiller('Happy to send payment as soon as we lock in the meetup.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 20),
    },
    {
      key: 'offer-desk-lamp-leo',
      listingKey: 'desk-lamp',
      buyerKey: 'leo',
      conversationKey: 'conv-desk-lamp-leo',
      offeredPrice: 26,
      meetupLocation: 'Reitz Union',
      meetupWindow: 'Tomorrow 2:00 PM - 2:20 PM',
      paymentMethod: 'gatorgoodsEscrow',
      message: addFiller('I can use escrow if you want the handoff to feel extra straightforward.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 23),
    },
    {
      key: 'offer-mini-fridge-noah',
      listingKey: 'mini-fridge',
      buyerKey: 'noah',
      conversationKey: 'conv-mini-fridge-noah',
      offeredPrice: 70,
      meetupLocation: 'Heavener Hall',
      meetupWindow: 'Today 6:00 PM - 6:20 PM',
      paymentMethod: 'cash',
      message: addFiller('Happy to pay asking price if the pickup can happen tonight.', OFFER_MESSAGE_VARIANTS),
      status: 'accepted',
      createdAt: subtractHours(now, 14),
    },
    {
      key: 'offer-mini-fridge-jasmine',
      listingKey: 'mini-fridge',
      buyerKey: 'jasmine',
      conversationKey: 'conv-mini-fridge-jasmine',
      offeredPrice: 66,
      meetupLocation: 'Heavener Hall',
      meetupWindow: 'Tomorrow 11:30 AM - 12:00 PM',
      paymentMethod: 'externalApp',
      message: addFiller('I can be a backup buyer if your current pickup falls through.', OFFER_MESSAGE_VARIANTS),
      status: 'declined',
      createdAt: subtractHours(now, 17),
    },
    {
      key: 'offer-sublease-presenter',
      listingKey: 'sublease-room',
      buyerKey: 'presenter',
      conversationKey: 'conv-sublease-presenter',
      offeredPrice: 740,
      meetupLocation: 'Sorority Row',
      meetupWindow: 'Tomorrow 5:30 PM - 6:00 PM',
      paymentMethod: 'gatorgoodsEscrow',
      message: addFiller('I am interested in a quick walkthrough and can move fast if it is a fit.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 11),
    },
    {
      key: 'offer-backpack-presenter',
      listingKey: 'backpack',
      buyerKey: 'presenter',
      conversationKey: 'conv-backpack-presenter',
      offeredPrice: 30,
      meetupLocation: 'Little Hall',
      meetupWindow: 'Tomorrow 3:00 PM - 3:20 PM',
      paymentMethod: 'cash',
      message: addFiller('If the current buyer passes, I can meet quickly between classes.', OFFER_MESSAGE_VARIANTS),
      status: 'declined',
      createdAt: subtractHours(now, 27),
    },
    {
      key: 'offer-stroller-ava-low',
      listingKey: 'stroller-organizer',
      buyerKey: 'ava',
      conversationKey: 'conv-stroller-ava',
      offeredPrice: 14,
      meetupLocation: 'Shands',
      meetupWindow: 'Tomorrow 1:00 PM - 1:20 PM',
      paymentMethod: 'externalApp',
      message: addFiller('Starting a little lower in case you want the pickup handled fast.', OFFER_MESSAGE_VARIANTS),
      status: 'declined',
      createdAt: subtractHours(now, 8),
    },
    {
      key: 'offer-stroller-ava-updated',
      listingKey: 'stroller-organizer',
      buyerKey: 'ava',
      conversationKey: 'conv-stroller-ava',
      offeredPrice: 17,
      meetupLocation: 'Shands',
      meetupWindow: 'Tomorrow 1:00 PM - 1:20 PM',
      paymentMethod: 'cash',
      message: addFiller('I sent an updated offer that is closer to asking price.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 7.1),
    },
  ];

  const favorites = [
    {
      profileKey: 'presenter',
      listingKeys: ['scooter', 'sublease-room', 'backpack'],
      mergeExisting: true,
    },
    {
      profileKey: 'ava',
      listingKeys: ['desk-lamp', 'guitar'],
      mergeExisting: false,
    },
    {
      profileKey: 'leo',
      listingKeys: ['mini-fridge'],
      mergeExisting: false,
    },
  ];

  return {
    presenterProfile,
    communityProfiles,
    profilesByKey,
    listings,
    conversations,
    offers,
    favorites,
  };
}

async function deleteExistingSeedData(config, deps = defaultDependencies()) {
  if (config.fullReset) {
    await deps.clearDatabase();

    return {
      mode: 'full reset',
      removedFavoritesCount: 0,
      deletedCounts: {
        messages: 0,
        conversations: 0,
        offers: 0,
        items: 0,
        profiles: 0,
      },
    };
  }

  const taggedItems = await deps.models.Item.find({seedTag: config.seedTag}).select('_id').lean();
  const taggedItemIds = taggedItems.map((item) => String(item._id));

  let removedFavoritesCount = 0;

  if (taggedItemIds.length > 0) {
    const profilesWithTaggedFavorites = await deps.models.Profile.find({
      profileFavorites: {$in: taggedItemIds},
    }).select('_id profileFavorites').lean();

    removedFavoritesCount = profilesWithTaggedFavorites.reduce(
      (count, profile) => count + profile.profileFavorites.filter((favoriteId) => taggedItemIds.includes(String(favoriteId))).length,
      0
    );

    await deps.models.Profile.updateMany(
      {profileFavorites: {$in: taggedItemIds}},
      {
        $pull: {
          profileFavorites: {$in: taggedItemIds},
        },
      }
    );
  }

  const deletedMessages = await deps.models.Message.deleteMany({seedTag: config.seedTag});
  const deletedConversations = await deps.models.Conversation.deleteMany({seedTag: config.seedTag});
  const deletedOffers = await deps.models.Offer.deleteMany({seedTag: config.seedTag});
  const deletedItems = await deps.models.Item.deleteMany({seedTag: config.seedTag});
  const deletedProfiles = await deps.models.Profile.deleteMany({seedTag: config.seedTag});

  return {
    mode: 'tag-only cleanup',
    removedFavoritesCount,
    deletedCounts: {
      messages: deletedMessages.deletedCount || 0,
      conversations: deletedConversations.deletedCount || 0,
      offers: deletedOffers.deletedCount || 0,
      items: deletedItems.deletedCount || 0,
      profiles: deletedProfiles.deletedCount || 0,
    },
  };
}

function buildLastReadAtMap(conversation, dataset, now) {
  const listingConversationMap = conversation.lastReadHoursAgoByParticipant || {};
  const lastReadMap = {};

  Object.entries(listingConversationMap).forEach(([participantKey, hoursAgo]) => {
    const profile = dataset.profilesByKey[participantKey];

    if (!profile) {
      return;
    }

    lastReadMap[profile.profileID] = subtractHours(now, hoursAgo);
  });

  return lastReadMap;
}

async function insertSeedDataset(dataset, config, deps = defaultDependencies()) {
  const now = config.now instanceof Date ? config.now : new Date(config.now || Date.now());
  const profileIdByKey = new Map();

  const presenterProfileDocument = await deps.models.Profile.findOneAndUpdate(
    {profileID: dataset.presenterProfile.profileID},
    {$set: {
      profileName: dataset.presenterProfile.profileName,
      profilePicture: dataset.presenterProfile.profilePicture,
      profileBanner: dataset.presenterProfile.profileBanner,
      profileBio: dataset.presenterProfile.profileBio,
      instagramUrl: dataset.presenterProfile.instagramUrl,
      linkedinUrl: dataset.presenterProfile.linkedinUrl,
      ufVerified: dataset.presenterProfile.ufVerified,
      profileRating: dataset.presenterProfile.profileRating,
      profileTotalRating: dataset.presenterProfile.profileTotalRating,
      trustMetrics: dataset.presenterProfile.trustMetrics,
      seedTag: null,
    }},
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    }
  );

  profileIdByKey.set('presenter', presenterProfileDocument.profileID);

  for (const profile of dataset.communityProfiles) {
    const createdProfile = await deps.models.Profile.findOneAndUpdate(
      {profileID: profile.profileID},
      {$set: {
        profileName: profile.profileName,
        profilePicture: profile.profilePicture,
        profileBanner: profile.profileBanner,
        profileBio: profile.profileBio,
        instagramUrl: profile.instagramUrl,
        linkedinUrl: profile.linkedinUrl,
        ufVerified: profile.ufVerified,
        profileRating: profile.profileRating,
        profileTotalRating: profile.profileTotalRating,
        trustMetrics: profile.trustMetrics,
        seedTag: config.seedTag,
      }},
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );

    profileIdByKey.set(profile.key, createdProfile.profileID);
  }

  const itemIdByKey = new Map();
  const itemByKey = new Map();

  for (const listing of dataset.listings) {
    const ownerProfile = dataset.profilesByKey[listing.ownerKey];
    const createdListing = await deps.models.Item.create({
      itemName: listing.itemName,
      itemCost: listing.itemCost,
      itemCondition: listing.itemCondition,
      itemLocation: listing.itemLocation,
      itemPicture: listing.itemPicture,
      itemDescription: listing.itemDescription,
      itemDetails: listing.itemDetails,
      userPublishingID: profileIdByKey.get(listing.ownerKey),
      userPublishingName: ownerProfile.profileName,
      itemCat: listing.itemCat,
      status: listing.status,
      date: listing.date,
      seedTag: config.seedTag,
    });

    itemIdByKey.set(listing.key, createdListing._id);
    itemByKey.set(listing.key, createdListing);
  }

  const conversationIdByKey = new Map();

  for (const conversation of dataset.conversations) {
    const participantIds = sortedParticipantIds(
      conversation.participantKeys.map((participantKey) => profileIdByKey.get(participantKey))
    );
    const listingId = itemIdByKey.get(conversation.listingKey) || null;
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const createdConversation = await deps.models.Conversation.create({
      participantIds,
      linkedListingIds: listingId ? [listingId] : [],
      activeListingId: listingId,
      lastMessageText: lastMessage.body,
      lastMessageAt: lastMessage.createdAt,
      lastReadAtByUser: buildLastReadAtMap(conversation, dataset, now),
      seedTag: config.seedTag,
      createdAt: conversation.messages[0]?.createdAt || now,
      updatedAt: lastMessage.createdAt,
    });

    conversationIdByKey.set(conversation.key, createdConversation._id);

    for (const message of conversation.messages) {
      await deps.models.Message.create({
        conversationId: createdConversation._id,
        senderClerkUserId: profileIdByKey.get(message.senderKey),
        body: message.body,
        attachedListingId: listingId,
        seedTag: config.seedTag,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      });
    }
  }

  const offerIdByKey = new Map();

  for (const offer of dataset.offers) {
    const buyerProfile = dataset.profilesByKey[offer.buyerKey];
    const listing = itemByKey.get(offer.listingKey);
    const createdOffer = await deps.models.Offer.create({
      listingId: itemIdByKey.get(offer.listingKey),
      buyerClerkUserId: profileIdByKey.get(offer.buyerKey),
      buyerDisplayName: buyerProfile.profileName,
      sellerClerkUserId: listing.userPublishingID,
      conversationId: conversationIdByKey.get(offer.conversationKey),
      offeredPrice: offer.offeredPrice,
      meetupLocation: offer.meetupLocation,
      meetupWindow: offer.meetupWindow,
      paymentMethod: offer.paymentMethod,
      message: offer.message,
      status: offer.status,
      seedTag: config.seedTag,
      createdAt: offer.createdAt,
      updatedAt: offer.createdAt,
    });

    offerIdByKey.set(offer.key, createdOffer._id);

    if (offer.status === 'accepted') {
      await deps.models.Item.findByIdAndUpdate(itemIdByKey.get(offer.listingKey), {
        reservedOfferId: createdOffer._id,
      });
    }
  }

  for (const favoriteGroup of dataset.favorites) {
    const profileId = profileIdByKey.get(favoriteGroup.profileKey);
    const favoriteIds = favoriteGroup.listingKeys
      .map((listingKey) => itemIdByKey.get(listingKey))
      .filter(Boolean)
      .map((itemId) => String(itemId));

    const profile = await deps.models.Profile.findOne({profileID: profileId});
    const existingFavorites = (profile?.profileFavorites || []).map((favoriteId) => String(favoriteId));
    const nextFavorites = favoriteGroup.mergeExisting
      ? uniqueStrings([...existingFavorites, ...favoriteIds])
      : favoriteIds;

    await deps.models.Profile.findOneAndUpdate(
      {profileID: profileId},
      {
        $set: {
          profileFavorites: nextFavorites,
        },
      }
    );
  }

  const presenterListingTitles = dataset.listings
    .filter((listing) => listing.ownerKey === 'presenter')
    .map((listing) => listing.itemName);
  const inboundOfferCounts = dataset.listings
    .filter((listing) => listing.ownerKey === 'presenter')
    .map((listing) => ({
      title: listing.itemName,
      inboundOfferCount: dataset.offers.filter((offer) => offer.listingKey === listing.key).length,
    }));

  return {
    presenter: {
      profileID: dataset.presenterProfile.profileID,
      profileName: dataset.presenterProfile.profileName,
      profilePicture: dataset.presenterProfile.profilePicture,
      source: config.presenterIdentity?.source || 'fallback',
      email: config.presenterIdentity?.email || config.demoUserEmail || '',
    },
    counts: {
      profiles: 1 + dataset.communityProfiles.length,
      items: dataset.listings.length,
      offers: dataset.offers.length,
      conversations: dataset.conversations.length,
      messages: dataset.conversations.reduce((count, conversation) => count + conversation.messages.length, 0),
    },
    presenterListingTitles,
    inboundOfferCounts,
    outboundOfferCount: dataset.offers.filter((offer) => offer.buyerKey === 'presenter').length,
    seedTag: config.seedTag,
    favorites: dataset.favorites.length,
  };
}

function printSeedSummary(summary, config, logger = console) {
  logger.log('Demo seed complete.');
  logger.log('');
  logger.log(`Presenter: ${summary.presenter.profileName} (${summary.presenter.profileID})`);
  logger.log(`Presenter source: ${summary.presenter.source}`);
  logger.log(`Cleanup mode: ${config.cleanupSummary.mode}`);

  if (config.cleanupSummary.mode === 'tag-only cleanup') {
    logger.log(`Cleanup seed tag: ${config.seedTag}`);
    logger.log(`Removed tagged favorites: ${config.cleanupSummary.removedFavoritesCount}`);
  }

  logger.log('');
  logger.log('Inserted counts:');
  logger.log(`  Profiles: ${summary.counts.profiles}`);
  logger.log(`  Listings: ${summary.counts.items}`);
  logger.log(`  Offers: ${summary.counts.offers}`);
  logger.log(`  Conversations: ${summary.counts.conversations}`);
  logger.log(`  Messages: ${summary.counts.messages}`);
  logger.log('');
  logger.log(`Presenter listings: ${summary.presenterListingTitles.join(', ')}`);
  summary.inboundOfferCounts.forEach((listingSummary) => {
    logger.log(`Inbound offers on ${listingSummary.title}: ${listingSummary.inboundOfferCount}`);
  });
  logger.log(`Outbound offers by presenter: ${summary.outboundOfferCount}`);
  logger.log('');
  logger.log('Reminder commands:');
  logger.log('  DEMO_USER_EMAIL=you@ufl.edu CLERK_SECRET_KEY=sk_test_xxx npm run seed:demo');
  logger.log('  SEED_FULL_RESET=true npm run seed:demo');
}

async function seedDemoData({
  env = process.env,
  fetchImpl = global.fetch,
  deps = defaultDependencies(),
} = {}) {
  const config = buildSeedConfigFromEnv(env);
  config.presenterIdentity = await resolvePresenterIdentity(config, {fetchImpl});
  config.cleanupSummary = await deleteExistingSeedData(config, deps);
  const dataset = buildSeedDataset(config);
  const summary = await insertSeedDataset(dataset, config, deps);
  printSeedSummary(summary, config);
  return {config, dataset, summary};
}

if (require.main === module) {
  connectToDatabase()
    .then(() => seedDemoData())
    .catch((error) => {
      console.error('Failed to seed demo data', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectFromDatabase().catch(() => {});
    });
}

module.exports = {
  buildSeedConfigFromEnv,
  buildSeedDataset,
  deleteExistingSeedData,
  insertSeedDataset,
  printSeedSummary,
  resolveClerkUserByEmail,
  resolvePresenterIdentity,
  seedDemoData,
};
