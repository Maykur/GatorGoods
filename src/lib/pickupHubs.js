const APPROVED_PICKUP_HUBS = Object.freeze([
  {
    id: 'library-west',
    label: 'Library West',
    area: 'Historic Core',
    shortLabel: 'Lib West',
    description: 'North edge of Plaza with strong daytime foot traffic.',
    mapX: 78,
    mapY: 7,
    publicSafe: true,
  },
  {
    id: 'marston',
    label: 'Marston Science Library',
    area: 'East Core',
    shortLabel: 'Marston',
    description: 'High-traffic library meetup point near main academic walkways.',
    mapX: 70,
    mapY: 45,
    publicSafe: true,
  },
  {
    id: 'reitz',
    label: 'Reitz Union',
    area: 'South Core',
    shortLabel: 'Reitz',
    description: 'Student union hub with seating, lighting, and regular activity.',
    mapX: 46,
    mapY: 69,
    publicSafe: true,
  },
  {
    id: 'plaza-americas',
    label: 'Plaza of the Americas',
    area: 'Historic Core',
    shortLabel: 'Plaza',
    description: 'Open central lawn bordered by high-traffic classroom routes.',
    mapX: 77.7,
    mapY: 22,
    publicSafe: true,
  },
  {
    id: 'turlington-hall',
    label: 'Turlington Hall',
    area: 'Historic Core',
    shortLabel: 'Turlington',
    description: 'Recognizable classroom-side meetup point just southwest of the Plaza.',
    mapX: 69,
    mapY: 35,
    publicSafe: true,
  },
  {
    id: 'broward',
    label: 'Broward Hall',
    area: 'East Residential',
    shortLabel: 'Broward',
    description: 'Residence-adjacent meetup point near Broward and Rawlings walkways.',
    mapX: 83,
    mapY: 63,
    publicSafe: true,
  },
  {
    id: 'hume-hall',
    label: 'Hume Hall',
    area: 'Southwest Residential',
    shortLabel: 'Hume',
    description: 'Honors-side residence hub near Museum Road and Flavet routes.',
    mapX: 16,
    mapY: 89,
    publicSafe: true,
  },
  {
    id: 'honors-village',
    label: 'Honors Village',
    area: 'Southeast Residential',
    shortLabel: 'Honors Village',
    description: 'East-side honors housing hub near Museum Road.',
    mapX: 83,
    mapY: 80,
    publicSafe: true,
  },
  {
    id: 'keys-residential-complex',
    label: 'Keys Residential Complex',
    area: 'Southwest Campus',
    shortLabel: 'Keys',
    description: 'Southwest residential complex near Stadium Road and Flavet.',
    mapX: 6,
    mapY: 50,
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