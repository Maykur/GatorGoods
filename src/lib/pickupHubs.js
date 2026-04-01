const APPROVED_PICKUP_HUBS = Object.freeze([
  {
    id: 'library-west',
    label: 'Library West',
    area: 'North East Campus',
    shortLabel: 'Lib West',
    description: 'Busy library entrance with strong daytime foot traffic.',
    mapX: 35,
    mapY: 24,
    publicSafe: true,
  },
  {
    id: 'marston',
    label: 'Marston Science Library',
    area: 'Central Campus',
    shortLabel: 'Marston',
    description: 'Popular library meetup point near main walkways.',
    mapX: 31,
    mapY: 32,
    publicSafe: true,
  },
  {
    id: 'reitz',
    label: 'Reitz Union',
    area: 'South Campus',
    shortLabel: 'Reitz',
    description: 'Student union hub with seating, lighting, and regular activity.',
    mapX: 42,
    mapY: 43,
    publicSafe: true,
  },
  {
    id: 'plaza-americas',
    label: 'Plaza of the Americas',
    area: 'North East Campus',
    shortLabel: 'Plaza',
    description: 'Open central lawn bordered by high-traffic classroom routes.',
    mapX: 46,
    mapY: 34,
    publicSafe: true,
  },
  {
    id: 'turlington-hall',
    label: 'Turlington Hall',
    area: 'Central Campus',
    shortLabel: 'Turlington',
    description: 'Recognizable classroom-side meetup point with steady daytime traffic.',
    mapX: 50,
    mapY: 38,
    publicSafe: true,
  },
  {
    id: 'broward',
    label: 'Broward Hall',
    area: 'East Campus',
    shortLabel: 'Broward',
    description: 'Residence-adjacent commons area with consistent student movement.',
    mapX: 47,
    mapY: 52,
    publicSafe: true,
  },
  {
    id: 'hume-hall',
    label: 'Hume Hall',
    area: 'South West Campus',
    shortLabel: 'Hume',
    description: 'High-visibility honors residence area near central walking routes.',
    mapX: 39,
    mapY: 56,
    publicSafe: true,
  },
  {
    id: 'honors-village',
    label: 'Honors Village',
    area: 'South East Campus',
    shortLabel: 'Honors Village',
    description: 'Public-facing honors housing area with broad student foot traffic.',
    mapX: 42,
    mapY: 60,
    publicSafe: true,
  },
  {
    id: 'keys-residential-complex',
    label: 'Keys Residential Complex',
    area: 'West Campus',
    shortLabel: 'Keys',
    description: 'Public-facing residential complex near major campus walkways.',
    mapX: 28,
    mapY: 58,
    publicSafe: true,
  },
]);

const PICKUP_HUBS_BY_ID = new Map(APPROVED_PICKUP_HUBS.map((hub) => [hub.id, hub]));
const PICKUP_HUB_ALIASES = new Map();

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLookupValue(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function registerHubAlias(hub, alias) {
  const normalizedAlias = normalizeLookupValue(alias);

  if (normalizedAlias) {
    PICKUP_HUB_ALIASES.set(normalizedAlias, hub.id);
  }
}

APPROVED_PICKUP_HUBS.forEach((hub) => {
  registerHubAlias(hub, hub.id);
  registerHubAlias(hub, hub.label);
  registerHubAlias(hub, hub.shortLabel);
});

function normalizePickupHubId(value) {
  const normalizedValue = normalizeText(value);
  return normalizedValue || null;
}

function getPickupHubById(value) {
  const hubId = normalizePickupHubId(value);
  return hubId ? PICKUP_HUBS_BY_ID.get(hubId) || null : null;
}

function findPickupHubByLabel(value) {
  const normalizedLookupValue = normalizeLookupValue(value);

  if (!normalizedLookupValue) {
    return null;
  }

  const hubId = PICKUP_HUB_ALIASES.get(normalizedLookupValue);
  return hubId ? getPickupHubById(hubId) : null;
}

function isApprovedPickupHubId(value) {
  return Boolean(getPickupHubById(value));
}

function resolvePickupHub(value) {
  return getPickupHubById(value) || findPickupHubByLabel(value);
}

function deriveListingPickupFields({pickupHubId, itemLocation} = {}) {
  const hub = getPickupHubById(pickupHubId) || findPickupHubByLabel(itemLocation);
  const normalizedLocation = normalizeText(itemLocation);

  return {
    pickupHubId: hub?.id || null,
    pickupArea: hub?.area || '',
    itemLocation: hub?.label || normalizedLocation,
  };
}

function deriveOfferPickupFields({meetupHubId, meetupLocation} = {}) {
  const hub = getPickupHubById(meetupHubId) || findPickupHubByLabel(meetupLocation);
  const normalizedLocation = normalizeText(meetupLocation);

  return {
    meetupHubId: hub?.id || null,
    meetupArea: hub?.area || '',
    meetupLocation: hub?.label || normalizedLocation,
  };
}

function getPickupHubLabel(value, fallback = '') {
  return resolvePickupHub(value)?.label || fallback;
}

function getPickupHubArea(value, fallback = '') {
  return resolvePickupHub(value)?.area || fallback;
}

const exported = {
  APPROVED_PICKUP_HUBS,
  deriveListingPickupFields,
  deriveOfferPickupFields,
  findPickupHubByLabel,
  getPickupHubArea,
  getPickupHubById,
  getPickupHubLabel,
  isApprovedPickupHubId,
  normalizePickupHubId,
  resolvePickupHub,
};

module.exports = exported;
module.exports.default = exported;
