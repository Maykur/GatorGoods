const fs = require('fs');
const path = require('path');
const {faker} = require('@faker-js/faker');
const {
  deriveListingPickupFields,
  deriveOfferPickupFields,
} = require('../../src/lib/pickupHubs');
const {toLocalDateInputValue} = require('../../src/lib/meetupSchedule');

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
    Transaction,
  },
} = require('../index');

const DEFAULT_SEED_TAG = 'gatorgoods-demo';
const DEFAULT_FAKER_SEED = 20260401;
const HOURS_TO_MS = 60 * 60 * 1000;
const CLERK_USERS_URL = 'https://api.clerk.com/v1/users';
const DEFAULT_PRESENTER_PICTURE =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80';

const PRESENTER_PROFILE_DEFAULTS = {
  profileName: 'Tyrell Wellick',
  profilePicture: DEFAULT_PRESENTER_PICTURE,
  profileBanner: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
  profileBio: 'Selling a polished mix of dorm and apartment essentials before summer move-out. I usually meet near Library West, Marston, or Reitz between classes.',
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
  'I can meet near Library West or Marston.',
  'I will message when I am walking over.',
];

const STUDY_SEED_IMAGE_DIR = path.join(__dirname, 'study-seed-images');

function readSeedImageDataUrl(filename) {
  const filePath = path.join(STUDY_SEED_IMAGE_DIR, filename);
  const imageBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filename).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';

  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(
    svg
      .replace(/\n\s+/g, '\n')
      .replace(/>\s+</g, '><')
      .trim()
  )}`;
}

function buildMarketplacePhoto({
  wallTop = '#d5d1ca',
  wallBottom = '#b6aea3',
  floorTop = '#79604e',
  floorBottom = '#443127',
  ambient = '#fff1d7',
  clutterMarkup = '',
  subjectMarkup = '',
  overlayMarkup = '',
}) {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 675" role="img" aria-label="Marketplace listing photo">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${wallTop}" />
          <stop offset="100%" stop-color="${wallBottom}" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${floorTop}" />
          <stop offset="100%" stop-color="${floorBottom}" />
        </linearGradient>
        <radialGradient id="windowGlow" cx="18%" cy="16%" r="46%">
          <stop offset="0%" stop-color="${ambient}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${ambient}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="42%" r="72%">
          <stop offset="52%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#081019" stop-opacity="0.34" />
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.10" />
          </feComponentTransfer>
        </filter>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#111827" flood-opacity="0.28" />
        </filter>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="900" height="675" fill="url(#wall)" />
      <rect width="900" height="675" fill="url(#windowGlow)" />
      <path d="M0 420 C170 392 328 402 476 416 C624 430 771 422 900 404 L900 675 L0 675 Z" fill="url(#floor)" />
      <ellipse cx="460" cy="505" rx="298" ry="64" fill="#0f172a" opacity="0.18" filter="url(#softBlur)" />
      ${clutterMarkup}
      <g filter="url(#softShadow)">
        ${subjectMarkup}
      </g>
      ${overlayMarkup}
      <rect width="900" height="675" fill="url(#vignette)" />
      <rect width="900" height="675" filter="url(#grain)" opacity="0.88" />
    </svg>
  `);
}

function createMiniFridgeImage({
  bodyColor = '#d8dde1',
  bodyShadow = '#b4bcc4',
  trimColor = '#f7f8f9',
  handleColor = '#5c6470',
  wallTop = '#d7d0c6',
  wallBottom = '#baaea3',
  floorTop = '#7a6558',
  floorBottom = '#45352b',
  stickerColor = '#fb7185',
  accentColor = '#9aa4b2',
  retro = false,
  scuffed = false,
  magnet = false,
  crateColor = '#8b5e3c',
}) {
  const dividerMarkup = retro
    ? '<rect x="418" y="204" width="18" height="24" rx="8" fill="#2f3640" opacity="0.6" />'
    : '<rect x="230" y="168" width="18" height="80" rx="8" fill="#4b5563" opacity="0.75" />';
  const scuffMarkup = scuffed
    ? `
      <path d="M252 168 C281 164 304 171 324 182" stroke="#94a3b8" stroke-width="6" opacity="0.45" />
      <path d="M356 301 C391 314 419 320 437 316" stroke="#64748b" stroke-width="7" opacity="0.3" />
      <circle cx="278" cy="327" r="7" fill="#9ca3af" opacity="0.3" />
    `
    : '';
  const magnetMarkup = magnet
    ? `
      <rect x="172" y="138" width="22" height="22" rx="6" fill="${stickerColor}" />
      <rect x="202" y="176" width="18" height="18" rx="5" fill="#fde68a" />
    `
    : '';

  return buildMarketplacePhoto({
    wallTop,
    wallBottom,
    floorTop,
    floorBottom,
    clutterMarkup: `
      <rect x="114" y="180" width="82" height="188" rx="8" fill="#f1f5f9" opacity="0.5" />
      <rect x="120" y="186" width="70" height="176" rx="6" fill="#dbeafe" opacity="0.3" />
      <path d="M112 404 C164 398 210 396 246 404" stroke="#0f172a" stroke-width="7" opacity="0.18" />
      <rect x="650" y="392" width="134" height="84" rx="8" fill="${crateColor}" opacity="0.86" />
      <rect x="665" y="372" width="88" height="36" rx="5" fill="#d6d3d1" opacity="0.72" />
      <path d="M701 383 C716 361 731 347 756 336" stroke="#16a34a" stroke-width="9" stroke-linecap="round" opacity="0.48" />
    `,
    subjectMarkup: `
      <g transform="translate(226 86) rotate(-2 165 208)">
        <rect x="0" y="0" width="274" height="392" rx="28" fill="${bodyShadow}" />
        <rect x="8" y="8" width="258" height="376" rx="24" fill="${bodyColor}" />
        <rect x="18" y="20" width="238" height="125" rx="20" fill="${trimColor}" opacity="0.74" />
        <rect x="22" y="152" width="230" height="216" rx="20" fill="${trimColor}" opacity="0.2" />
        <rect x="22" y="150" width="230" height="3" fill="${accentColor}" opacity="0.48" />
        ${dividerMarkup}
        <rect x="248" y="190" width="10" height="112" rx="5" fill="${handleColor}" opacity="0.82" />
        <rect x="248" y="75" width="10" height="46" rx="5" fill="${handleColor}" opacity="0.82" />
        <rect x="42" y="342" width="188" height="15" rx="7" fill="#0f172a" opacity="0.1" />
        ${magnetMarkup}
        ${scuffMarkup}
      </g>
    `,
  });
}

function createDeskLampImage() {
  return buildMarketplacePhoto({
    wallTop: '#d7d5db',
    wallBottom: '#b1b3bb',
    floorTop: '#6d5a4f',
    floorBottom: '#3b2b24',
    clutterMarkup: `
      <rect x="128" y="420" width="664" height="38" rx="8" fill="#6b4f3e" />
      <rect x="160" y="446" width="18" height="116" rx="9" fill="#2f241c" />
      <rect x="738" y="446" width="18" height="116" rx="9" fill="#2f241c" />
      <rect x="520" y="388" width="112" height="30" rx="6" fill="#f8fafc" opacity="0.75" />
      <rect x="542" y="360" width="84" height="24" rx="6" fill="#475569" opacity="0.35" />
      <rect x="212" y="386" width="96" height="26" rx="4" fill="#1e293b" opacity="0.78" />
    `,
    subjectMarkup: `
      <g transform="translate(186 116) rotate(-5 124 236)">
        <rect x="72" y="296" width="130" height="18" rx="9" fill="#111827" />
        <rect x="108" y="156" width="20" height="150" rx="10" fill="#2d3748" />
        <path d="M118 156 C96 118 82 98 64 70" stroke="#2d3748" stroke-width="18" stroke-linecap="round" fill="none" />
        <path d="M62 70 C88 54 118 46 156 52 L180 104 C145 116 112 117 82 104 Z" fill="#e5e7eb" />
        <ellipse cx="138" cy="123" rx="68" ry="18" fill="#ffd166" opacity="0.22" filter="url(#softBlur)" />
        <path d="M82 100 C110 112 142 112 177 101" stroke="#cbd5e1" stroke-width="5" opacity="0.55" />
      </g>
    `,
  });
}

function createRollingCartImage({frameColor = '#334155', basketColor = '#94a3b8', accentColor = '#f59e0b'} = {}) {
  return buildMarketplacePhoto({
    wallTop: '#d7d7cf',
    wallBottom: '#b4b2a5',
    floorTop: '#886c57',
    floorBottom: '#503d2f',
    clutterMarkup: `
      <rect x="612" y="220" width="108" height="210" rx="8" fill="#d6d3d1" opacity="0.42" />
      <rect x="144" y="358" width="88" height="74" rx="10" fill="#f1f5f9" opacity="0.6" />
      <rect x="156" y="340" width="64" height="22" rx="6" fill="#cbd5e1" opacity="0.72" />
    `,
    subjectMarkup: `
      <g transform="translate(258 118) rotate(-4 145 226)">
        <path d="M44 78 L28 386" stroke="${frameColor}" stroke-width="10" stroke-linecap="round" />
        <path d="M244 78 L262 386" stroke="${frameColor}" stroke-width="10" stroke-linecap="round" />
        <path d="M86 78 L74 386" stroke="${frameColor}" stroke-width="8" stroke-linecap="round" opacity="0.85" />
        <path d="M202 78 L214 386" stroke="${frameColor}" stroke-width="8" stroke-linecap="round" opacity="0.85" />
        <rect x="28" y="74" width="236" height="54" rx="12" fill="${basketColor}" opacity="0.86" />
        <rect x="38" y="164" width="226" height="52" rx="12" fill="${basketColor}" opacity="0.9" />
        <rect x="46" y="256" width="214" height="52" rx="12" fill="${basketColor}" opacity="0.92" />
        <rect x="62" y="88" width="40" height="28" rx="6" fill="#fde68a" />
        <rect x="196" y="176" width="32" height="24" rx="6" fill="${accentColor}" opacity="0.9" />
        <rect x="102" y="267" width="88" height="28" rx="8" fill="#f8fafc" opacity="0.82" />
        <circle cx="54" cy="394" r="15" fill="#1f2937" />
        <circle cx="236" cy="396" r="15" fill="#1f2937" />
      </g>
    `,
  });
}

function createKitchenCartImage() {
  return buildMarketplacePhoto({
    wallTop: '#d8d3ce',
    wallBottom: '#b8b0a4',
    floorTop: '#836556',
    floorBottom: '#4a372d',
    clutterMarkup: `
      <rect x="118" y="232" width="126" height="162" rx="8" fill="#fb7185" opacity="0.16" />
      <rect x="616" y="180" width="132" height="260" rx="12" fill="#f8fafc" opacity="0.22" />
    `,
    subjectMarkup: `
      <g transform="translate(248 110) rotate(-3 162 220)">
        <rect x="42" y="54" width="236" height="38" rx="10" fill="#9a6b49" />
        <rect x="54" y="92" width="212" height="18" rx="8" fill="#475569" opacity="0.6" />
        <rect x="58" y="132" width="206" height="22" rx="10" fill="#cbd5e1" opacity="0.88" />
        <rect x="68" y="212" width="196" height="22" rx="10" fill="#cbd5e1" opacity="0.88" />
        <path d="M72 92 L58 362" stroke="#475569" stroke-width="9" stroke-linecap="round" />
        <path d="M248 92 L262 362" stroke="#475569" stroke-width="9" stroke-linecap="round" />
        <path d="M112 92 L104 362" stroke="#64748b" stroke-width="7" stroke-linecap="round" opacity="0.85" />
        <path d="M214 92 L222 362" stroke="#64748b" stroke-width="7" stroke-linecap="round" opacity="0.85" />
        <rect x="88" y="146" width="64" height="34" rx="8" fill="#f59e0b" opacity="0.82" />
        <rect x="168" y="226" width="46" height="30" rx="8" fill="#f8fafc" opacity="0.82" />
        <circle cx="82" cy="374" r="14" fill="#1f2937" />
        <circle cx="238" cy="376" r="14" fill="#1f2937" />
      </g>
    `,
  });
}

function createGraphingCalculatorImage() {
  return buildMarketplacePhoto({
    wallTop: '#d8d5cf',
    wallBottom: '#bab3a6',
    floorTop: '#706053',
    floorBottom: '#3d312a',
    clutterMarkup: `
      <rect x="148" y="214" width="620" height="282" rx="16" fill="#5b4334" />
      <rect x="164" y="234" width="588" height="242" rx="12" fill="#6b4f3e" />
      <rect x="182" y="252" width="242" height="152" rx="14" fill="#f8fafc" opacity="0.88" />
      <path d="M200 278 H402" stroke="#cbd5e1" stroke-width="8" opacity="0.7" />
      <path d="M200 316 H404" stroke="#cbd5e1" stroke-width="8" opacity="0.55" />
      <path d="M200 354 H378" stroke="#cbd5e1" stroke-width="8" opacity="0.55" />
    `,
    subjectMarkup: `
      <g transform="translate(446 166) rotate(8 124 168)">
        <rect x="0" y="0" width="246" height="336" rx="20" fill="#111827" />
        <rect x="16" y="18" width="214" height="72" rx="10" fill="#9fb8c8" opacity="0.92" />
        <rect x="34" y="116" width="174" height="180" rx="16" fill="#1f2937" opacity="0.88" />
        <g fill="#e5e7eb">
          <rect x="32" y="118" width="30" height="20" rx="6" />
          <rect x="72" y="118" width="30" height="20" rx="6" />
          <rect x="112" y="118" width="30" height="20" rx="6" />
          <rect x="152" y="118" width="30" height="20" rx="6" />
          <rect x="32" y="150" width="30" height="20" rx="6" />
          <rect x="72" y="150" width="30" height="20" rx="6" />
          <rect x="112" y="150" width="30" height="20" rx="6" />
          <rect x="152" y="150" width="30" height="20" rx="6" />
          <rect x="32" y="182" width="30" height="20" rx="6" />
          <rect x="72" y="182" width="30" height="20" rx="6" />
          <rect x="112" y="182" width="30" height="20" rx="6" />
          <rect x="152" y="182" width="30" height="20" rx="6" />
          <rect x="32" y="214" width="30" height="20" rx="6" />
          <rect x="72" y="214" width="30" height="20" rx="6" />
          <rect x="112" y="214" width="30" height="20" rx="6" />
          <rect x="152" y="214" width="30" height="20" rx="6" />
          <rect x="32" y="246" width="30" height="20" rx="6" />
          <rect x="72" y="246" width="30" height="20" rx="6" />
          <rect x="112" y="246" width="30" height="20" rx="6" />
          <rect x="152" y="246" width="30" height="20" rx="6" />
        </g>
        <rect x="46" y="56" width="110" height="10" rx="5" fill="#475569" opacity="0.55" />
      </g>
    `,
  });
}

function createCableKitImage() {
  return buildMarketplacePhoto({
    wallTop: '#d2d7dd',
    wallBottom: '#aeb7c2',
    floorTop: '#6d625b',
    floorBottom: '#3b312c',
    clutterMarkup: `
      <rect x="110" y="188" width="680" height="290" rx="18" fill="#3f3f46" opacity="0.82" />
      <rect x="132" y="210" width="644" height="248" rx="14" fill="#18181b" opacity="0.92" />
      <rect x="564" y="234" width="152" height="92" rx="12" fill="#111827" opacity="0.42" />
    `,
    subjectMarkup: `
      <g transform="translate(164 190) rotate(-3 284 136)">
        <rect x="0" y="0" width="568" height="272" rx="18" fill="#27272a" stroke="#52525b" stroke-width="10" />
        <rect x="22" y="22" width="524" height="228" rx="14" fill="#09090b" />
        <path d="M88 96 C126 42 190 54 212 98 C232 138 296 132 314 88" stroke="#38bdf8" stroke-width="14" fill="none" stroke-linecap="round" />
        <path d="M108 176 C164 144 206 146 258 180" stroke="#f97316" stroke-width="12" fill="none" stroke-linecap="round" />
        <path d="M314 162 C362 104 420 118 468 170" stroke="#94a3b8" stroke-width="14" fill="none" stroke-linecap="round" />
        <rect x="402" y="58" width="72" height="52" rx="10" fill="#1f2937" />
        <rect x="416" y="72" width="44" height="26" rx="6" fill="#22c55e" opacity="0.5" />
        <rect x="78" y="52" width="52" height="36" rx="8" fill="#fafaf9" opacity="0.85" />
        <circle cx="278" cy="124" r="16" fill="#f8fafc" opacity="0.9" />
      </g>
    `,
  });
}

function createMonitorStandImage() {
  return buildMarketplacePhoto({
    wallTop: '#d5d5d9',
    wallBottom: '#aeb0b8',
    floorTop: '#6a594f',
    floorBottom: '#3b2e28',
    clutterMarkup: `
      <rect x="126" y="392" width="648" height="44" rx="10" fill="#4b5563" />
      <rect x="174" y="430" width="18" height="118" rx="8" fill="#2f343d" />
      <rect x="710" y="430" width="18" height="118" rx="8" fill="#2f343d" />
      <rect x="202" y="230" width="220" height="124" rx="16" fill="#111827" opacity="0.25" />
      <rect x="520" y="232" width="172" height="112" rx="16" fill="#111827" opacity="0.18" />
    `,
    subjectMarkup: `
      <g transform="translate(250 250) rotate(-2 188 90)">
        <rect x="0" y="44" width="376" height="60" rx="14" fill="#334155" />
        <rect x="36" y="0" width="304" height="52" rx="12" fill="#475569" />
        <rect x="60" y="18" width="118" height="18" rx="8" fill="#cbd5e1" opacity="0.76" />
        <rect x="202" y="14" width="112" height="24" rx="10" fill="#f8fafc" opacity="0.86" />
        <rect x="104" y="106" width="164" height="20" rx="10" fill="#111827" opacity="0.72" />
        <path d="M112 126 C130 156 146 177 168 196" stroke="#111827" stroke-width="9" opacity="0.55" stroke-linecap="round" />
        <path d="M252 126 C270 148 284 168 306 184" stroke="#111827" stroke-width="9" opacity="0.5" stroke-linecap="round" />
      </g>
    `,
  });
}

function createVanityMirrorImage() {
  return buildMarketplacePhoto({
    wallTop: '#dcd4cf',
    wallBottom: '#b8aea6',
    floorTop: '#7b6352',
    floorBottom: '#45342b',
    clutterMarkup: `
      <rect x="140" y="352" width="134" height="96" rx="10" fill="#d97706" opacity="0.52" />
      <rect x="604" y="342" width="124" height="118" rx="12" fill="#f1f5f9" opacity="0.46" />
    `,
    subjectMarkup: `
      <g transform="translate(274 122) rotate(-5 152 214)">
        <rect x="16" y="0" width="276" height="404" rx="28" fill="#8b5e34" />
        <rect x="30" y="18" width="248" height="368" rx="22" fill="#e5ddd5" />
        <rect x="52" y="40" width="204" height="324" rx="18" fill="#9ec5db" opacity="0.72" />
        <path d="M88 108 C132 72 176 74 212 112" stroke="#f8fafc" stroke-width="10" opacity="0.35" stroke-linecap="round" />
        <g fill="#fde68a" opacity="0.9">
          <circle cx="38" cy="52" r="8" />
          <circle cx="272" cy="52" r="8" />
          <circle cx="38" cy="124" r="8" />
          <circle cx="272" cy="124" r="8" />
          <circle cx="38" cy="196" r="8" />
          <circle cx="272" cy="196" r="8" />
          <circle cx="38" cy="268" r="8" />
          <circle cx="272" cy="268" r="8" />
          <circle cx="38" cy="340" r="8" />
          <circle cx="272" cy="340" r="8" />
        </g>
      </g>
    `,
  });
}

const SEED_LISTING_IMAGES = {
  campusScooter: readSeedImageDataUrl('campus-scooter.png'),
  deskLamp: readSeedImageDataUrl('desk-lamp.png'),
  miniFridgeCore: readSeedImageDataUrl('mini-fridge.png'),
  miniFridgeBlack: readSeedImageDataUrl('mini-fridge-black.png'),
  miniFridgeRetro: readSeedImageDataUrl('mini-fridge-retro.png'),
  miniFridgeSteel: readSeedImageDataUrl('mini-fridge-freezer.png'),
  miniFridgeDormWhite: readSeedImageDataUrl('mini-fridge-dorm-white.png'),
  airPurifier: readSeedImageDataUrl('air-purifier.png'),
  blackHoodie: readSeedImageDataUrl('black-hoodie.png'),
  strollerCaddy: readSeedImageDataUrl('stroller-caddy.png'),
  gamingMonitor: readSeedImageDataUrl('gaming-monitor.png'),
  leatherBriefcase: readSeedImageDataUrl('leather-briefcase.png'),
  businessCaseStudy: readSeedImageDataUrl('business-case-study.png'),
  analogSynth: readSeedImageDataUrl('analog-synth.png'),
  rollingCart: readSeedImageDataUrl('rolling-cart.png'),
  kitchenCart: readSeedImageDataUrl('kitchen-cart.png'),
  graphingCalculator: readSeedImageDataUrl('graphing-calculator.png'),
  cableKit: readSeedImageDataUrl('cable-kit.png'),
  monitorStand: readSeedImageDataUrl('monitor-stand.png'),
  labStool: readSeedImageDataUrl('lab-stool.png'),
  vanityMirror: readSeedImageDataUrl('vanity-mirror.png'),
};

const SEED_PROFILE_IMAGES = {
  angelaMoss: readSeedImageDataUrl('profile-angela-moss.png'),
  whiterose: readSeedImageDataUrl('profile-whiterose.png'),
  edwardAlderson: readSeedImageDataUrl('profile-edward-alderson.png'),
  phillipPrice: readSeedImageDataUrl('profile-phillip-price.png'),
  darleneAlderson: readSeedImageDataUrl('profile-darlene-alderson.png'),
};

const COMMUNITY_PROFILES = [
  {
    key: 'ava',
    profileID: 'demo_ava_morgan',
    profileName: 'Angela Moss',
    profilePicture: SEED_PROFILE_IMAGES.angelaMoss,
    profileBanner: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Trying to build a cleaner, more put-together apartment setup and likes plans that are clear, polished, and actually happen.',
    instagramUrl: 'https://instagram.com/angelamoss.market',
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
    profileName: 'Whiterose',
    profilePicture: SEED_PROFILE_IMAGES.whiterose,
    profileBanner: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Time is the only thing that matters. If we agree on a handoff, expect precision, not improvisation.',
    instagramUrl: 'https://instagram.com/whiterose.market',
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
    profileName: 'Edward Alderson',
    profilePicture: SEED_PROFILE_IMAGES.edwardAlderson,
    profileBanner: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Selling worn layers, patched-together gear, and whatever still mostly works. Prefers cash, changes pickup windows more than he should, and treats detailed questions like a personal attack.',
    instagramUrl: 'https://instagram.com/edwardalderson.market',
    linkedinUrl: '',
    ufVerified: false,
    profileRating: 3.1,
    profileTotalRating: 11,
    trustMetrics: {
      reliability: 58,
      accuracy: 54,
      responsiveness: 61,
      safety: 49,
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
    profileName: 'Phillip Price',
    profilePicture: SEED_PROFILE_IMAGES.phillipPrice,
    profileBanner: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Moves items fast, rarely documents every flaw, and has very little patience for indecisive buyers. If you want reassurance, he is probably not your seller.',
    instagramUrl: '',
    linkedinUrl: 'https://linkedin.com/in/phillipprice-demo',
    ufVerified: false,
    profileRating: 3.2,
    profileTotalRating: 12,
    trustMetrics: {
      reliability: 60,
      accuracy: 48,
      responsiveness: 57,
      safety: 58,
    },
  },
  {
    key: 'sofia',
    profileID: 'demo_sofia_alvarez',
    profileName: 'Sofia Alvarez',
    profilePicture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Design student clearing desk gear, decor, and a few apartment extras before finals week.',
    instagramUrl: 'https://instagram.com/sofia.uf.market',
    linkedinUrl: '',
    profileRating: 4.7,
    profileTotalRating: 18,
    trustMetrics: {
      reliability: 93,
      accuracy: 94,
      responsiveness: 91,
      safety: 95,
    },
  },
  {
    key: 'cameron',
    profileID: 'demo_cameron_wells',
    profileName: 'Darlene Alderson',
    profilePicture: SEED_PROFILE_IMAGES.darleneAlderson,
    profileBanner: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Flips leftover tech and desk gear in bursts, hates detailed questions, and assumes people can figure out missing pieces on their own. Replies fast until she vanishes for half a day.',
    instagramUrl: '',
    linkedinUrl: 'https://linkedin.com/in/cameronwells-uf',
    ufVerified: false,
    profileRating: 2.9,
    profileTotalRating: 9,
    trustMetrics: {
      reliability: 52,
      accuracy: 46,
      responsiveness: 64,
      safety: 51,
    },
  },
  {
    key: 'nina',
    profileID: 'demo_nina_park',
    profileName: 'Nina Park',
    profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    profileBanner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
    profileBio: 'Moving apartments soon and cycling through small furniture, mirrors, and studio storage pieces.',
    instagramUrl: 'https://instagram.com/ninapark.uf',
    linkedinUrl: '',
    profileRating: 4.8,
    profileTotalRating: 21,
    trustMetrics: {
      reliability: 96,
      accuracy: 94,
      responsiveness: 90,
      safety: 96,
    },
  },
];

const THEMED_PROFILE_KEYS = new Set(['ava', 'jasmine', 'noah', 'mateo', 'cameron']);
const AUTO_ASSIGNABLE_PROFILE_KEYS = [
  'presenter',
  'leo',
  'priya',
  'sofia',
  'nina',
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
      Transaction,
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

function addDays(now, dayOffset) {
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + dayOffset);
  return nextDate;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

function sortedParticipantIds(participantIds = []) {
  return uniqueStrings(participantIds).sort();
}

function normalizeDemoUserSelection(rawSelection, entryLabel = 'DEMO_USER entry') {
  if (typeof rawSelection === 'string') {
    const normalizedValue = trimEnvValue(rawSelection);

    if (!normalizedValue) {
      return null;
    }

    return normalizedValue.includes('@')
      ? {email: normalizedValue}
      : {id: normalizedValue};
  }

  if (!rawSelection || typeof rawSelection !== 'object' || Array.isArray(rawSelection)) {
    throw new Error(`${entryLabel} must be a string or object.`);
  }

  const email = trimEnvValue(rawSelection.email || rawSelection.emailAddress);
  const id = trimEnvValue(rawSelection.id || rawSelection.userId || rawSelection.profileID);
  const profileName = trimEnvValue(rawSelection.profileName || rawSelection.name);
  const profilePicture = trimEnvValue(
    rawSelection.profilePicture || rawSelection.picture || rawSelection.imageUrl
  );
  const clerkSecretKey = trimEnvValue(rawSelection.clerkSecretKey || rawSelection.secretKey);
  const clerkSecretKeyEnv = trimEnvValue(rawSelection.clerkSecretKeyEnv || rawSelection.secretKeyEnv);

  if (!email && !id) {
    throw new Error(`${entryLabel} must include an email or id.`);
  }

  return {
    ...(email ? {email} : {}),
    ...(id ? {id} : {}),
    ...(profileName ? {profileName} : {}),
    ...(profilePicture ? {profilePicture} : {}),
    ...(clerkSecretKey ? {clerkSecretKey} : {}),
    ...(clerkSecretKeyEnv ? {clerkSecretKeyEnv} : {}),
  };
}

function parseDemoUserMap(value) {
  const trimmedValue = trimEnvValue(value);

  if (!trimmedValue) {
    return {};
  }

  let parsedValue;

  try {
    parsedValue = JSON.parse(trimmedValue);
  } catch (error) {
    throw new Error('DEMO_USER_MAP must be valid JSON.');
  }

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    throw new Error('DEMO_USER_MAP must be a JSON object keyed by seed profile key.');
  }

  return Object.entries(parsedValue).reduce((result, [profileKey, rawSelection]) => {
    const normalizedProfileKey = trimEnvValue(profileKey);

    if (!normalizedProfileKey) {
      return result;
    }

    const normalizedSelection = normalizeDemoUserSelection(
      rawSelection,
      `DEMO_USER_MAP entry for "${normalizedProfileKey}"`
    );

    if (normalizedSelection) {
      result[normalizedProfileKey] = normalizedSelection;
    }

    return result;
  }, {});
}

function parseDemoUserAssignments(value) {
  const trimmedValue = trimEnvValue(value);

  if (!trimmedValue) {
    return [];
  }

  let parsedValue;

  try {
    parsedValue = JSON.parse(trimmedValue);
  } catch (error) {
    throw new Error('DEMO_USER_ASSIGNMENTS must be valid JSON.');
  }

  if (!Array.isArray(parsedValue)) {
    throw new Error('DEMO_USER_ASSIGNMENTS must be a JSON array.');
  }

  return parsedValue
    .map((entry, index) =>
      normalizeDemoUserSelection(entry, `DEMO_USER_ASSIGNMENTS entry at index ${index}`)
    )
    .filter(Boolean);
}

function buildSeedConfigFromEnv(env = process.env) {
  return {
    demoUserEmail: trimEnvValue(env.DEMO_USER_EMAIL),
    demoUserId: trimEnvValue(env.DEMO_USER_ID),
    demoUserMap: parseDemoUserMap(env.DEMO_USER_MAP),
    demoUserAssignments: parseDemoUserAssignments(env.DEMO_USER_ASSIGNMENTS),
    clerkSecretKey: trimEnvValue(env.CLERK_SECRET_KEY),
    fullReset: parseBooleanEnv(env.SEED_FULL_RESET),
    seedTag: trimEnvValue(env.SEED_TAG) || DEFAULT_SEED_TAG,
    fakerSeed: parseFakerSeed(env.FAKER_SEED),
    now: new Date(),
    envValues: {...env},
    presenterIdentity: null,
    profileIdentityOverrides: {},
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

function getClerkUserEmails(user = {}) {
  const primaryEmailObject = user.primaryEmailAddress || user.primary_email_address || null;
  const emailAddresses = Array.isArray(user.emailAddresses)
    ? user.emailAddresses
    : Array.isArray(user.email_addresses)
      ? user.email_addresses
      : [];

  return uniqueStrings([
    primaryEmailObject?.emailAddress,
    primaryEmailObject?.email_address,
    ...emailAddresses.map((emailObject) => emailObject?.emailAddress || emailObject?.email_address),
  ].map((email) => trimEnvValue(email).toLowerCase()).filter(Boolean));
}

function getClerkUserPrimaryEmail(user = {}) {
  return trimEnvValue(
    user?.primaryEmailAddress?.emailAddress ||
    user?.primaryEmailAddress?.email_address ||
    user?.primary_email_address?.emailAddress ||
    user?.primary_email_address?.email_address
  ).toLowerCase();
}

function formatSeedOfferEventBody(eventType, {buyerDisplayName = '', sellerDisplayName = ''} = {}) {
  const normalizedBuyerName = trimEnvValue(buyerDisplayName) || 'Buyer';
  const normalizedSellerName = trimEnvValue(sellerDisplayName) || 'Seller';

  if (eventType === 'sent') {
    return `${normalizedBuyerName} sent an offer.`;
  }

  if (eventType === 'accepted') {
    return `${normalizedSellerName} accepted your offer.`;
  }

  if (eventType === 'declined') {
    return `${normalizedSellerName} rejected your offer.`;
  }

  return '';
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
  const matchingUsers = (Array.isArray(users) ? users : []).filter((user) =>
    getClerkUserEmails(user).includes(normalizedEmail.toLowerCase())
  );

  if (matchingUsers.length === 0) {
    throw new Error(`No Clerk user was found for ${normalizedEmail}.`);
  }

  const primaryEmailMatches = matchingUsers.filter(
    (user) => getClerkUserPrimaryEmail(user) === normalizedEmail.toLowerCase()
  );
  const resolvedMatches = primaryEmailMatches.length > 0 ? primaryEmailMatches : matchingUsers;

  if (resolvedMatches.length > 1) {
    throw new Error(`Multiple Clerk users matched ${normalizedEmail}. Use a direct Clerk id instead.`);
  }

  const clerkUser = resolvedMatches[0] || null;

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

async function resolveClerkUserById(
  userId,
  {
    fetchImpl = global.fetch,
    clerkSecretKey = process.env.CLERK_SECRET_KEY,
    fallbackName = PRESENTER_PROFILE_DEFAULTS.profileName,
    fallbackPicture = PRESENTER_PROFILE_DEFAULTS.profilePicture,
    profileName = '',
    profilePicture = '',
  } = {}
) {
  const normalizedUserId = trimEnvValue(userId);

  if (!normalizedUserId) {
    throw new Error('A Clerk user id is required.');
  }

  const resolvedFallbackName = trimEnvValue(profileName) || fallbackName;
  const resolvedFallbackPicture = trimEnvValue(profilePicture) || fallbackPicture;

  if (!trimEnvValue(clerkSecretKey) || typeof fetchImpl !== 'function') {
    return {
      profileID: normalizedUserId,
      profileName: resolvedFallbackName,
      profilePicture: resolvedFallbackPicture,
      source: 'clerk-id',
      email: '',
    };
  }

  const response = await fetchImpl(`${CLERK_USERS_URL}/${normalizedUserId}`, {
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

  const clerkUser = await response.json();
  const emailAddresses = Array.isArray(clerkUser?.emailAddresses)
    ? clerkUser.emailAddresses
    : Array.isArray(clerkUser?.email_addresses)
      ? clerkUser.email_addresses
      : [];
  const primaryEmailObject = clerkUser?.primaryEmailAddress || clerkUser?.primary_email_address || null;

  return {
    profileID: clerkUser.id || normalizedUserId,
    profileName: buildDisplayNameFromClerkUser(clerkUser) || resolvedFallbackName,
    profilePicture:
      trimEnvValue(clerkUser?.imageUrl || clerkUser?.image_url) || resolvedFallbackPicture,
    source: 'clerk-id',
    email:
      trimEnvValue(primaryEmailObject?.emailAddress || primaryEmailObject?.email_address) ||
      trimEnvValue(emailAddresses[0]?.emailAddress || emailAddresses[0]?.email_address) ||
      '',
  };
}

function buildSeedProfileDefaultsByKey() {
  return COMMUNITY_PROFILES.reduce(
    (result, profile) => {
      result[profile.key] = {
        profileName: profile.profileName,
        profilePicture: profile.profilePicture,
      };
      return result;
    },
    {
      presenter: {
        profileName: PRESENTER_PROFILE_DEFAULTS.profileName,
        profilePicture: PRESENTER_PROFILE_DEFAULTS.profilePicture,
      },
    }
  );
}

function resolveSelectionClerkSecretKey(selection, envValues = {}, fallbackSecretKey = '') {
  const inlineSecretKey = trimEnvValue(selection?.clerkSecretKey);

  if (inlineSecretKey) {
    return inlineSecretKey;
  }

  const secretKeyEnvName = trimEnvValue(selection?.clerkSecretKeyEnv);

  if (secretKeyEnvName) {
    const envSecretKey = trimEnvValue(envValues?.[secretKeyEnvName]);

    if (!envSecretKey) {
      throw new Error(`Missing Clerk secret key in env var "${secretKeyEnvName}" for DEMO_USER_MAP entry.`);
    }

    return envSecretKey;
  }

  return trimEnvValue(fallbackSecretKey);
}

async function resolveSeedProfileIdentities(config, {fetchImpl = global.fetch} = {}) {
  const defaultProfilesByKey = buildSeedProfileDefaultsByKey();
  const identitySelections = (config.demoUserAssignments || []).reduce((result, selection, index) => {
    const profileKey = AUTO_ASSIGNABLE_PROFILE_KEYS[index];

    if (!profileKey) {
      throw new Error(
        `DEMO_USER_ASSIGNMENTS only supports up to ${AUTO_ASSIGNABLE_PROFILE_KEYS.length} users.`
      );
    }

    result[profileKey] = selection;
    return result;
  }, {
    ...config.demoUserMap,
  });

  Object.entries(config.demoUserMap || {}).forEach(([profileKey, selection]) => {
    identitySelections[profileKey] = selection;
  });

  if (!identitySelections.presenter && config.demoUserEmail) {
    identitySelections.presenter = {email: config.demoUserEmail};
  }

  if (!identitySelections.presenter && config.demoUserId) {
    identitySelections.presenter = {id: config.demoUserId};
  }

  const resolvedIdentities = {};

  for (const [profileKey, selection] of Object.entries(identitySelections)) {
    const defaults = defaultProfilesByKey[profileKey];
    const resolvedClerkSecretKey = resolveSelectionClerkSecretKey(
      selection,
      config.envValues,
      config.clerkSecretKey
    );

    if (!defaults) {
      throw new Error(`Unknown seed profile key "${profileKey}" in DEMO_USER_MAP.`);
    }

    if (selection.email) {
      resolvedIdentities[profileKey] = await resolveClerkUserByEmail(selection.email, {
        fetchImpl,
        clerkSecretKey: resolvedClerkSecretKey,
      });
      continue;
    }

    resolvedIdentities[profileKey] = await resolveClerkUserById(selection.id, {
      fetchImpl,
      clerkSecretKey: resolvedClerkSecretKey,
      fallbackName: defaults.profileName,
      fallbackPicture: defaults.profilePicture,
      profileName: selection.profileName,
      profilePicture: selection.profilePicture,
    });
  }

  return resolvedIdentities;
}

async function resolvePresenterIdentity(config, {fetchImpl = global.fetch} = {}) {
  const resolvedIdentities = await resolveSeedProfileIdentities(config, {fetchImpl});

  if (resolvedIdentities.presenter) {
    return resolvedIdentities.presenter;
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
  const profileIdentityOverrides = config.profileIdentityOverrides || {};

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
  const schedule = (dayOffset, meetupTime) => ({
    meetupDate: toLocalDateInputValue(addDays(now, dayOffset)),
    meetupTime,
  });
  const buildBuyerReview = ({
    submittedAt,
    decision = 'confirmed',
    reliability,
    accuracy,
    responsiveness,
    safety,
    details,
  }) => ({
    decision,
    questionnaireType: decision === 'problemReported' ? 'problem' : 'success',
    answers: {
      reliability,
      accuracy,
      responsiveness,
      safety,
      details,
    },
    metricScores: {
      reliability,
      accuracy,
      responsiveness,
      safety,
    },
    submittedAt,
  });
  const buildSellerReview = ({
    submittedAt,
    decision = 'confirmed',
    reliability,
    responsiveness,
    safety,
    details,
  }) => ({
    decision,
    questionnaireType: decision === 'problemReported' ? 'problem' : 'success',
    answers: {
      reliability,
      responsiveness,
      safety,
      details,
    },
    metricScores: {
      reliability,
      responsiveness,
      safety,
    },
    submittedAt,
  });

  const communityProfiles = COMMUNITY_PROFILES.map((profile) => ({
    ...profile,
    profileID: profileIdentityOverrides[profile.key]?.profileID || profile.profileID,
    profileName: profileIdentityOverrides[profile.key]?.profileName || profile.profileName,
    profilePicture: profileIdentityOverrides[profile.key]?.profilePicture || profile.profilePicture,
    profileBio: THEMED_PROFILE_KEYS.has(profile.key)
      ? profile.profileBio
      : addFiller(profile.profileBio, BIO_VARIANTS),
    ufVerified: profile.ufVerified !== undefined ? Boolean(profile.ufVerified) : true,
    seedTag: profileIdentityOverrides[profile.key] ? null : config.seedTag,
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
      originalPickupHubId: 'library-west',
      pickupHubId: 'reitz',
      itemPicture: SEED_LISTING_IMAGES.deskLamp,
      itemDescription: 'A bright desk lamp that makes late-night study sessions easier without taking much desk space.',
      itemDetails: 'Warm bulb included and the neck still pivots smoothly. Listed with a Library West default, but the accepted meetup moved after negotiation.',
      itemCat: 'Home & Garden',
      status: 'reserved',
      date: subtractHours(now, 5),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge',
      ownerKey: 'presenter',
      itemName: 'Mini Fridge',
      itemCost: '70',
      itemCondition: 'Fair',
      pickupHubId: 'hume-hall',
      itemPicture: SEED_LISTING_IMAGES.miniFridgeCore,
      itemDescription: 'Compact dorm mini fridge that still cools quickly and fits under a lofted bed.',
      itemDetails: 'Some cosmetic wear on the door, but it runs reliably. Pickup usually works best near Hume Hall in the evening.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 22),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge-black',
      ownerKey: 'leo',
      itemName: 'Black Mini Fridge',
      itemCost: '62',
      itemCondition: 'Good',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.miniFridgeBlack,
      itemDescription: 'Compact black mini fridge with a clean door seal and enough room for drinks, leftovers, and the usual exam-week survival kit.',
      itemDetails: 'Cools quickly, fits under a dorm desk, and already has one buyer asking about a pickup after class tomorrow.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 18),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge-retro',
      ownerKey: 'sofia',
      itemName: 'Retro Mini Fridge',
      itemCost: '85',
      itemCondition: 'Good',
      pickupHubId: 'reitz',
      itemPicture: SEED_LISTING_IMAGES.miniFridgeRetro,
      itemDescription: 'Retro-style mini fridge that still feels dorm-practical and keeps drinks cold without hogging much floor space.',
      itemDetails: 'Works reliably, has light cosmetic wear on the side panel, and could be picked up near Reitz after studio tomorrow.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 14),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge-dorm-white',
      ownerKey: 'noah',
      itemName: 'Dorm Mini Fridge',
      itemCost: '54',
      itemCondition: 'Fair',
      pickupHubId: 'broward',
      itemPicture: SEED_LISTING_IMAGES.miniFridgeDormWhite,
      itemDescription: 'Basic white dorm fridge that still cools, though it hums louder than it should and looks every bit its age.',
      itemDetails: 'Older than the others, has scuffs on the door, and the shelf clips are mismatched. It still works, but I am not dragging it around for a second meetup if somebody changes their mind.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 11),
      seedTag: config.seedTag,
    },
    {
      key: 'mini-fridge-freezer',
      ownerKey: 'mateo',
      itemName: 'Mini Fridge with Freezer',
      itemCost: '78',
      itemCondition: 'Fair',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.miniFridgeSteel,
      itemDescription: 'Mini fridge with a freezer shelf that still gets cold, though the door seal sticks and the freezer frosts if you pack it too full.',
      itemDetails: 'Currently reserved for a campus meetup near Marston. There is a dent on one side and I am not dragging it back upstairs for a long inspection once it is outside.',
      itemCat: 'Home & Garden',
      status: 'reserved',
      date: subtractHours(now, 6),
      seedTag: config.seedTag,
    },
    {
      key: 'headphones',
      ownerKey: 'leo',
      itemName: 'Noise-Cancelling Headphones',
      itemCost: '85',
      itemCondition: 'Good',
      pickupHubId: 'reitz',
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
      pickupHubId: 'keys-residential-complex',
      itemPicture: SEED_LISTING_IMAGES.campusScooter,
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
      itemName: 'Summer Sublease Near Honors Village',
      itemCost: '780',
      itemCondition: 'Excellent',
      pickupHubId: 'honors-village',
      itemPicture: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Private furnished room in a 4x4 with clean lines, in-unit laundry, and enough distance from campus noise to think clearly.',
      itemDetails: 'Available May through July. Parking and most utilities are covered. Tours and key handoff are coordinated with exact timing, not vague windows.',
      itemCat: 'Property Rentals',
      status: 'active',
      date: subtractHours(now, 12),
      seedTag: config.seedTag,
    },
    {
      key: 'storage-drawers',
      ownerKey: 'jasmine',
      itemName: 'Precision Storage Drawers',
      itemCost: '35',
      itemCondition: 'Good',
      pickupHubId: 'turlington-hall',
      itemPicture: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Modular drawers for cables, documents, adapters, and anything else that should stop cluttering a surface.',
      itemDetails: 'Reserved for pickup later this week after a tightly scheduled afternoon meetup near Turlington Hall. Everything is already packed and labeled.',
      itemCat: 'Miscellaneous',
      status: 'reserved',
      date: subtractHours(now, 28),
      seedTag: config.seedTag,
    },
    {
      key: 'standing-desk',
      ownerKey: 'jasmine',
      itemName: 'Compact Standing Desk',
      itemCost: '110',
      itemCondition: 'Good',
      pickupHubId: 'honors-village',
      itemPicture: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Compact adjustable desk with a clean silhouette and just enough surface area for focused work.',
      itemDetails: 'Already sold through the same relationship thread, but it stays in the seed as a completed-history example. The mechanism still moves smoothly and precisely.',
      itemCat: 'Home & Garden',
      status: 'sold',
      date: subtractHours(now, 34),
      seedTag: config.seedTag,
    },
    {
      key: 'shoe-rack',
      ownerKey: 'jasmine',
      itemName: 'Narrow Shoe Rack',
      itemCost: '16',
      itemCondition: 'Good',
      pickupHubId: 'honors-village',
      itemPicture: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      itemDescription: 'Slim entryway rack for shoes, umbrellas, and the illusion that chaos can be neatly contained near the door.',
      itemDetails: 'This listing is intentionally deleted after seeding so the messaging thread keeps a historical deleted-item example.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 6),
      seedTag: config.seedTag,
    },
    {
      key: 'denim-jacket',
      ownerKey: 'noah',
      itemName: 'Black Zip Hoodie',
      itemCost: '42',
      itemCondition: 'Fair',
      pickupHubId: 'plaza-americas',
      itemPicture: SEED_LISTING_IMAGES.blackHoodie,
      itemDescription: 'Black hoodie from a smoke-free-ish apartment that is broken in, a little faded, and still wearable.',
      itemDetails: 'One cuff is stretched and the zipper catches near the bottom if you rush it. Sold as-is, no holds, and pickup only after I message that I am actually nearby.',
      itemCat: 'Apparel & Accessories',
      status: 'active',
      date: subtractHours(now, 20),
      seedTag: config.seedTag,
    },
    {
      key: 'guitar',
      ownerKey: 'noah',
      itemName: 'Analog Synth Keyboard',
      itemCost: '95',
      itemCondition: 'Fair',
      pickupHubId: 'broward',
      itemPicture: SEED_LISTING_IMAGES.analogSynth,
      itemDescription: 'Compact analog-style synth that powers on and makes sound, though one knob crackles and the setup is a little temperamental.',
      itemDetails: 'Third-party power adapter included. A couple inputs are touchy, and I am not building a full demo session for everybody who wants to noodle with it for twenty minutes.',
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
      pickupHubId: 'honors-village',
      itemPicture: SEED_LISTING_IMAGES.strollerCaddy,
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
      pickupHubId: 'broward',
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
      itemName: 'Business Strategy Case Study Set',
      itemCost: '55',
      itemCondition: 'Fair',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.businessCaseStudy,
      itemDescription: 'Strategy cases, annotated notes, and loose printouts from a semester that was more useful than tidy.',
      itemDetails: 'Several pages are heavily marked, a couple packets are out of order, and I am not resorting the whole stack for anyone who expects pristine copies.',
      itemCat: 'Miscellaneous',
      status: 'active',
      date: subtractHours(now, 15),
      seedTag: config.seedTag,
    },
    {
      key: 'backpack',
      ownerKey: 'mateo',
      itemName: 'Leather Briefcase',
      itemCost: '34',
      itemCondition: 'Fair',
      pickupHubId: 'turlington-hall',
      itemPicture: SEED_LISTING_IMAGES.leatherBriefcase,
      itemDescription: 'Structured leather briefcase with room for a laptop and a better first impression than the average backpack.',
      itemDetails: 'Corners are worn, the lining has a small tear, and I am not doing returns because somebody expected new leather at thrift pricing.',
      itemCat: 'Apparel & Accessories',
      status: 'active',
      date: subtractHours(now, 30),
      seedTag: config.seedTag,
    },
    {
      key: 'air-purifier',
      ownerKey: 'presenter',
      itemName: 'Compact Air Purifier',
      itemCost: '52',
      itemCondition: 'Good',
      originalPickupHubId: 'marston',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.airPurifier,
      itemDescription: 'Quiet bedside air purifier that still has a fresh replacement filter and works well in a dorm bedroom.',
      itemDetails: 'Reserved for a same-day meetup near Marston after the buyer asked for a faster pickup tonight.',
      itemCat: 'Home & Garden',
      status: 'reserved',
      date: subtractHours(now, 4),
      seedTag: config.seedTag,
    },
    {
      key: 'rolling-cart',
      ownerKey: 'presenter',
      itemName: 'Three-Tier Rolling Cart',
      itemCost: '24',
      itemCondition: 'Good',
      pickupHubId: 'reitz',
      itemPicture: SEED_LISTING_IMAGES.rollingCart,
      itemDescription: 'Slim rolling cart that works well beside a desk, printer station, or apartment bathroom.',
      itemDetails: 'Still available and already drew interest from the same buyer who reserved the air purifier.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 7),
      seedTag: config.seedTag,
    },
    {
      key: 'graphing-calculator',
      ownerKey: 'leo',
      itemName: 'TI-84 Graphing Calculator',
      itemCost: '58',
      itemCondition: 'Good',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.graphingCalculator,
      itemDescription: 'Reliable calculator with a fresh set of batteries and a clean screen cover.',
      itemDetails: 'Reserved after Angela confirmed she could meet near Marston between classes tomorrow.',
      itemCat: 'Electronics & Computers',
      status: 'reserved',
      date: subtractHours(now, 10),
      seedTag: config.seedTag,
    },
    {
      key: 'gaming-monitor',
      ownerKey: 'sofia',
      itemName: '24-inch Gaming Monitor',
      itemCost: '115',
      itemCondition: 'Good',
      pickupHubId: 'marston',
      itemPicture: SEED_LISTING_IMAGES.gamingMonitor,
      itemDescription: '1080p monitor with an adjustable stand and HDMI cable included.',
      itemDetails: 'The handoff already happened, but it remains in the demo as a problem-reported transaction example.',
      itemCat: 'Electronics & Computers',
      status: 'sold',
      date: subtractHours(now, 36),
      seedTag: config.seedTag,
    },
    {
      key: 'kitchen-cart',
      ownerKey: 'sofia',
      itemName: 'Kitchen Utility Cart',
      itemCost: '48',
      itemCondition: 'Good',
      pickupHubId: 'reitz',
      itemPicture: SEED_LISTING_IMAGES.kitchenCart,
      itemDescription: 'A small rolling kitchen cart with two shelves and locking wheels.',
      itemDetails: 'Still active, with an interested buyer already chatting in the same thread as the completed monitor sale.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 11),
      seedTag: config.seedTag,
    },
    {
      key: 'bike-lock-bundle',
      ownerKey: 'cameron',
      itemName: 'Raspberry Pi Cable Kit',
      itemCost: '19',
      itemCondition: 'Fair',
      pickupHubId: 'turlington-hall',
      itemPicture: SEED_LISTING_IMAGES.cableKit,
      itemDescription: 'Raspberry Pi starter bundle with assorted cables, adapters, and project leftovers pulled from a few old bins.',
      itemDetails: 'I did not inventory every adapter and a couple pieces are generic substitutes. What is in the photo is what you get, sold as-is.',
      itemCat: 'Electronics & Computers',
      status: 'active',
      date: subtractHours(now, 16),
      seedTag: config.seedTag,
    },
    {
      key: 'monitor-stand',
      ownerKey: 'cameron',
      itemName: 'Dual Monitor Riser',
      itemCost: '20',
      itemCondition: 'Fair',
      pickupHubId: 'reitz',
      itemPicture: SEED_LISTING_IMAGES.monitorStand,
      itemDescription: 'Low-profile riser that clears desk clutter, though it has scuffs and one foot pad went missing somewhere along the way.',
      itemDetails: 'Still works, still sturdy enough, and I am not meeting twice because someone forgot to measure their desk before showing up.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 13),
      seedTag: config.seedTag,
    },
    {
      key: 'lab-stool',
      ownerKey: 'nina',
      itemName: 'Drafting Lab Stool',
      itemCost: '38',
      itemCondition: 'Good',
      pickupHubId: 'turlington-hall',
      itemPicture: SEED_LISTING_IMAGES.labStool,
      itemDescription: 'Tall adjustable stool that works well at a drafting desk or standing-height table.',
      itemDetails: 'Still available after Nina and Tyrell talked through pickup options in the same thread as a past mirror sale.',
      itemCat: 'Home & Garden',
      status: 'active',
      date: subtractHours(now, 8),
      seedTag: config.seedTag,
    },
    {
      key: 'vanity-mirror',
      ownerKey: 'nina',
      itemName: 'Lighted Vanity Mirror',
      itemCost: '44',
      itemCondition: 'Good',
      pickupHubId: 'turlington-hall',
      itemPicture: SEED_LISTING_IMAGES.vanityMirror,
      itemDescription: 'Framed mirror with built-in lights that still packs easily for apartment move-out.',
      itemDetails: 'Recently sold in a smooth handoff and left in the seed as another completed transaction example.',
      itemCat: 'Home & Garden',
      status: 'sold',
      date: subtractHours(now, 26),
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
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-ava',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 30),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'desk-lamp',
          body: 'Hi, I could still meet near Library West after my chem lecture if the lamp is available. A quick confirmation would help.',
          createdAt: subtractHours(now, 29.8),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'desk-lamp',
          body: 'That should work. I am on campus most of the afternoon and can keep it packed up.',
          createdAt: subtractHours(now, 29.5),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-ava',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 18.7),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'desk-lamp',
          body: 'Thanks for the quick heads-up. If anything changes, feel free to message me.',
          createdAt: subtractHours(now, 18.4),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 19,
        ava: 18.4,
      },
    },
    {
      key: 'conv-desk-lamp-ethan',
      listingKey: 'desk-lamp',
      participantKeys: ['presenter', 'ethan'],
      activePickupHubId: 'reitz',
      activePickupSpecifics: 'Ground floor entrance by the benches.',
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-ethan',
          offerEventType: 'sent',
          body: 'Ethan sent an offer.',
          createdAt: subtractHours(now, 20),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'desk-lamp',
          body: 'Tomorrow around lunch is workable. I will be nearby after my morning class.',
          createdAt: subtractHours(now, 19.6),
        },
        {
          senderKey: 'ethan',
          attachedListingKey: 'desk-lamp',
          body: 'Sounds good. Let me know if the timing shifts.',
          createdAt: subtractHours(now, 19.1),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-ethan',
          offerEventType: 'accepted',
          body: 'Tyrell accepted your offer.',
          createdAt: subtractHours(now, 18.8),
        },
        {
          senderKey: 'ethan',
          body: 'Quick update: could we switch the handoff to Reitz instead? I have a club meeting nearby right after.',
          createdAt: subtractHours(now, 18.2),
        },
        {
          senderKey: 'presenter',
          body: 'Yes, Reitz works for me. I can meet near the ground floor entrance and keep it quick.',
          createdAt: subtractHours(now, 17.9),
        },
        {
          senderKey: 'system',
          body: 'Meetup details updated to Reitz Union. Specifics: Ground floor entrance by the benches.',
          createdAt: subtractHours(now, 17.7),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 17.7,
        ethan: 17.7,
      },
    },
    {
      key: 'conv-mini-fridge-noah',
      activeListingKey: 'mini-fridge',
      linkedListingKeys: ['desk-lamp', 'mini-fridge'],
      participantKeys: ['presenter', 'noah'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-noah',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 32),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'desk-lamp',
          body: 'I wanted to close the loop quickly on the lamp. The earlier buyer confirmed, but I can still keep you posted if another listing comes up.',
          createdAt: subtractHours(now, 31.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-noah',
          offerEventType: 'sent',
          body: 'Edward Alderson sent an offer.',
          createdAt: subtractHours(now, 14),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'That works. I already wiped it down and can meet outside the Hume side entrance.',
          createdAt: subtractHours(now, 13.7),
        },
        {
          senderKey: 'noah',
          attachedListingKey: 'mini-fridge',
          body: 'Fine. I will bring cash, but I cannot promise an exact minute until I am already moving. If I am a little behind, I will ping you when I am close.',
          createdAt: subtractHours(now, 13.4),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'Sounds good. I will have it unplugged and ready by then.',
          createdAt: subtractHours(now, 12.9),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 12.9,
        noah: 13.2,
      },
    },
    {
      key: 'conv-presenter-jasmine',
      activeListingKey: 'sublease-room',
      linkedListingKeys: ['mini-fridge', 'sublease-room', 'storage-drawers', 'standing-desk', 'shoe-rack'],
      participantKeys: ['presenter', 'jasmine'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-jasmine',
          offerEventType: 'sent',
          body: 'Whiterose sent an offer.',
          createdAt: subtractHours(now, 17),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'Thanks for sending it over. I already promised it to another buyer, but I wanted to keep you posted quickly.',
          createdAt: subtractHours(now, 16.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-jasmine',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 16.5),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'sublease-room',
          offerKey: 'offer-sublease-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 11),
        },
        {
          senderKey: 'jasmine',
          attachedListingKey: 'sublease-room',
          body: 'There is one spot open. I can send a walkthrough later today, but if you want it, decide quickly. Time has a way of punishing hesitation.',
          createdAt: subtractHours(now, 10.7),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'storage-drawers',
          offerKey: 'offer-storage-drawers-presenter',
          offerEventType: 'accepted',
          body: 'Whiterose accepted your offer.',
          createdAt: subtractHours(now, 9.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'standing-desk',
          body: 'Sale completed. Pickup finished near Honors Village and both sides confirmed the handoff.',
          createdAt: subtractHours(now, 8.9),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'shoe-rack',
          body: 'I was also interested in the shoe rack if it is still around, but I noticed the listing disappeared.',
          createdAt: subtractHours(now, 3.2),
        },
        {
          senderKey: 'jasmine',
          attachedListingKey: 'sublease-room',
          body: 'The shoe rack is gone. The sublease remains available, and I can send the walkthrough tonight if you are serious.',
          createdAt: subtractHours(now, 2.7),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 3.1,
        jasmine: 3.2,
      },
    },
    {
      key: 'conv-backpack-presenter',
      activeListingKey: 'backpack',
      linkedListingKeys: ['textbook-bundle', 'backpack'],
      participantKeys: ['presenter', 'mateo'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'textbook-bundle',
          offerKey: 'offer-textbook-bundle-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 28.5),
        },
        {
          senderKey: 'mateo',
          attachedListingKey: 'textbook-bundle',
          body: 'Yes, it is still available for the moment. I do not hold things for tentative buyers, especially when the stack is already packed.',
          createdAt: subtractHours(now, 28.1),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'backpack',
          offerKey: 'offer-backpack-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 27),
        },
        {
          senderKey: 'mateo',
          attachedListingKey: 'backpack',
          body: 'Tomorrow works if you bring exact cash and arrive on time. Another buyer is already ahead of you, so if they confirm first this is finished.',
          createdAt: subtractHours(now, 26.4),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'backpack',
          offerKey: 'offer-backpack-presenter',
          offerEventType: 'declined',
          body: 'Phillip Price rejected your offer.',
          createdAt: subtractHours(now, 26.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 26.1,
        mateo: 26.1,
      },
    },
    {
      key: 'conv-stroller-ava',
      activeListingKey: 'stroller-organizer',
      linkedListingKeys: ['board-game', 'stroller-organizer', 'storage-drawers'],
      participantKeys: ['ava', 'priya'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'board-game',
          offerKey: 'offer-board-game-ava',
          offerEventType: 'accepted',
          body: 'Priya accepted Angela Moss\'s offer.',
          createdAt: subtractHours(now, 42.3),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'board-game',
          body: 'Sale completed. Meetup finished near Broward Hall and the board game was handed off successfully.',
          createdAt: subtractHours(now, 39.5),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'stroller-organizer',
          offerKey: 'offer-stroller-ava-low',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 8),
        },
        {
          senderKey: 'priya',
          attachedListingKey: 'stroller-organizer',
          body: 'Tomorrow afternoon works. The first offer was a little low, but I am open to another one.',
          createdAt: subtractHours(now, 7.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'stroller-organizer',
          offerKey: 'offer-stroller-ava-low',
          offerEventType: 'declined',
          body: 'Priya rejected your offer.',
          createdAt: subtractHours(now, 7.4),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'stroller-organizer',
          offerKey: 'offer-stroller-ava-updated',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 7.1),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'storage-drawers',
          body: 'Those storage drawers are nice too. If they somehow open back up, let me know.',
          createdAt: subtractHours(now, 6.8),
        },
      ],
      lastReadHoursAgoByParticipant: {
        ava: 7.1,
        priya: 7.1,
      },
    },
    {
      key: 'conv-presenter-cameron',
      activeListingKey: 'air-purifier',
      linkedListingKeys: ['air-purifier', 'rolling-cart'],
      participantKeys: ['presenter', 'cameron'],
      activePickupHubId: 'marston',
      activePickupSpecifics: 'North entrance under the shade trees.',
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'air-purifier',
          offerKey: 'offer-air-purifier-cameron',
          offerEventType: 'sent',
          body: 'Darlene Alderson sent an offer.',
          createdAt: subtractHours(now, 6.5),
        },
        {
          senderKey: 'cameron',
          attachedListingKey: 'air-purifier',
          body: 'I can probably meet after class if the purifier is still available. Keep it quick and do not disappear on me if I am a few minutes off.',
          createdAt: subtractHours(now, 6.2),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'air-purifier',
          body: 'That timing works. I can bring it to Marston and keep the meetup fast.',
          createdAt: subtractHours(now, 5.9),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'air-purifier',
          offerKey: 'offer-air-purifier-cameron',
          offerEventType: 'accepted',
          body: 'Tyrell accepted your offer.',
          createdAt: subtractHours(now, 5.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'rolling-cart',
          offerKey: 'offer-rolling-cart-cameron',
          offerEventType: 'sent',
          body: 'Darlene Alderson sent an offer.',
          createdAt: subtractHours(now, 4.7),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'rolling-cart',
          body: 'I can hold the rolling cart until tomorrow if you still want it after tonight.',
          createdAt: subtractHours(now, 4.3),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 4.4,
        cameron: 4.7,
      },
    },
    {
      key: 'conv-air-purifier-ava',
      activeListingKey: 'air-purifier',
      participantKeys: ['presenter', 'ava'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'air-purifier',
          offerKey: 'offer-air-purifier-ava',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 8.2),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'air-purifier',
          body: 'Thanks for the offer. Another buyer could meet sooner tonight, so I wanted to be transparent.',
          createdAt: subtractHours(now, 7.8),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'air-purifier',
          offerKey: 'offer-air-purifier-ava',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 7.5),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 7.5,
        ava: 7.5,
      },
    },
    {
      key: 'conv-mini-fridge-ava',
      activeListingKey: 'mini-fridge',
      participantKeys: ['presenter', 'ava'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-ava',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 9.5),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'mini-fridge',
          body: 'I can do a quick evening pickup if the fridge is still available after your current buyer. I would rather lock in a clear plan now.',
          createdAt: subtractHours(now, 9.2),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'Thanks. I have one buyer ahead of you, but I will keep this thread updated.',
          createdAt: subtractHours(now, 8.9),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 9,
        ava: 9.2,
      },
    },
    {
      key: 'conv-mini-fridge-cameron',
      activeListingKey: 'mini-fridge',
      participantKeys: ['presenter', 'cameron'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-cameron',
          offerEventType: 'sent',
          body: 'Darlene Alderson sent an offer.',
          createdAt: subtractHours(now, 10.4),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'I appreciate it. I am keeping the price a little higher for now because there are a few buyers interested.',
          createdAt: subtractHours(now, 10.1),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-cameron',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 9.8),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 9.8,
        cameron: 9.8,
      },
    },
    {
      key: 'conv-rolling-cart-leo',
      activeListingKey: 'rolling-cart',
      linkedListingKeys: ['desk-lamp', 'headphones', 'scooter', 'mini-fridge', 'rolling-cart'],
      participantKeys: ['presenter', 'leo'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-leo',
          offerEventType: 'sent',
          body: 'Leo sent an offer.',
          createdAt: subtractHours(now, 23),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'desk-lamp',
          body: addFiller('Thanks for the offer. Reitz could work if the lamp is still available tomorrow afternoon.', MESSAGE_VARIANTS),
          createdAt: subtractHours(now, 22.4),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'desk-lamp',
          offerKey: 'offer-desk-lamp-leo',
          offerEventType: 'declined',
          body: 'Tyrell rejected your offer.',
          createdAt: subtractHours(now, 18.6),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'headphones',
          body: 'The headphones from last time have been great, by the way.',
          createdAt: subtractHours(now, 6.3),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'scooter',
          body: 'Glad to hear it. I still need to post the scooter if you want me to send that your way too.',
          createdAt: subtractHours(now, 6.1),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'mini-fridge',
          body: 'If the fridge buyer falls through later, I would at least take a look. I am trying not to keep buying half your room one listing at a time.',
          createdAt: subtractHours(now, 5.95),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'rolling-cart',
          offerKey: 'offer-rolling-cart-leo',
          offerEventType: 'sent',
          body: 'Leo sent an offer.',
          createdAt: subtractHours(now, 5.8),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'rolling-cart',
          body: 'I could use the cart for lab gear. If tomorrow at Reitz still works, I can pick it up between classes.',
          createdAt: subtractHours(now, 5.5),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'rolling-cart',
          body: 'That timing works. I have another buyer asking too, but I can keep you posted if it stays available.',
          createdAt: subtractHours(now, 5.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 5.1,
        leo: 5.3,
      },
    },
    {
      key: 'conv-mini-fridge-priya',
      activeListingKey: 'mini-fridge',
      linkedListingKeys: ['board-game', 'stroller-organizer', 'mini-fridge'],
      participantKeys: ['presenter', 'priya'],
      messages: [
        {
          senderKey: 'presenter',
          attachedListingKey: 'board-game',
          body: 'I saw the board game handoff went smoothly on your side. Good to know.',
          createdAt: subtractHours(now, 7.7),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge',
          offerKey: 'offer-mini-fridge-priya',
          offerEventType: 'sent',
          body: 'Priya sent an offer.',
          createdAt: subtractHours(now, 7.3),
        },
        {
          senderKey: 'priya',
          attachedListingKey: 'mini-fridge',
          body: 'If the current buyer backs out, I could pick this up tomorrow and keep the meetup easy.',
          createdAt: subtractHours(now, 7.0),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'mini-fridge',
          body: 'Thanks. I have one buyer in front, but I will let you know quickly if it opens back up.',
          createdAt: subtractHours(now, 6.7),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 6.7,
        priya: 6.9,
      },
    },
    {
      key: 'conv-mini-fridge-black-priya',
      activeListingKey: 'mini-fridge-black',
      participantKeys: ['leo', 'priya'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge-black',
          offerKey: 'offer-mini-fridge-black-priya',
          offerEventType: 'sent',
          body: 'Priya sent an offer.',
          createdAt: subtractHours(now, 8.4),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'mini-fridge-black',
          body: 'That timing works if you can meet near Marston after lunch. It is already unplugged and ready to move.',
          createdAt: subtractHours(now, 8.0),
        },
        {
          senderKey: 'priya',
          attachedListingKey: 'mini-fridge-black',
          body: 'Perfect. I can bring help carrying it if needed and would rather keep the pickup quick.',
          createdAt: subtractHours(now, 7.7),
        },
      ],
      lastReadHoursAgoByParticipant: {
        leo: 7.8,
        priya: 7.7,
      },
    },
    {
      key: 'conv-mini-fridge-retro-cameron',
      activeListingKey: 'mini-fridge-retro',
      linkedListingKeys: ['kitchen-cart', 'mini-fridge-retro'],
      participantKeys: ['sofia', 'cameron'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge-retro',
          offerKey: 'offer-mini-fridge-retro-cameron',
          offerEventType: 'sent',
          body: 'Darlene Alderson sent an offer.',
          createdAt: subtractHours(now, 5.9),
        },
        {
          senderKey: 'sofia',
          attachedListingKey: 'mini-fridge-retro',
          body: 'I can meet near Reitz tomorrow after studio if that still works for you. The fridge is clean and cools without any issues.',
          createdAt: subtractHours(now, 5.5),
        },
        {
          senderKey: 'cameron',
          attachedListingKey: 'kitchen-cart',
          body: 'That works if you are actually on time. The cart in your other listing is tempting too, but I am not making two trips for one seller this week.',
          createdAt: subtractHours(now, 5.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        sofia: 5.2,
        cameron: 5.1,
      },
    },
    {
      key: 'conv-mini-fridge-freezer-ethan',
      activeListingKey: 'mini-fridge-freezer',
      participantKeys: ['mateo', 'ethan'],
      activePickupHubId: 'marston',
      activePickupSpecifics: 'North entrance by the bus loop benches.',
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge-freezer',
          offerKey: 'offer-mini-fridge-freezer-ethan',
          offerEventType: 'sent',
          body: 'Ethan sent an offer.',
          createdAt: subtractHours(now, 4.4),
        },
        {
          senderKey: 'mateo',
          attachedListingKey: 'mini-fridge-freezer',
          body: 'That price is fine. The freezer frosts a little if you overload it, but it works. Bring exact cash and keep the pickup window exact.',
          createdAt: subtractHours(now, 4.1),
        },
        {
          senderKey: 'ethan',
          attachedListingKey: 'mini-fridge-freezer',
          body: 'Confirmed. I can be there on time and can bring a friend to help carry it if needed.',
          createdAt: subtractHours(now, 3.8),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'mini-fridge-freezer',
          offerKey: 'offer-mini-fridge-freezer-ethan',
          offerEventType: 'accepted',
          body: 'Phillip Price accepted your offer.',
          createdAt: subtractHours(now, 3.5),
        },
        {
          senderKey: 'ethan',
          attachedListingKey: 'mini-fridge-freezer',
          body: 'Great. I will message once I am walking over from Marston so the timing stays tight.',
          createdAt: subtractHours(now, 3.2),
        },
      ],
      lastReadHoursAgoByParticipant: {
        mateo: 3.3,
        ethan: 3.2,
      },
    },
    {
      key: 'conv-rolling-cart-sofia',
      activeListingKey: 'rolling-cart',
      linkedListingKeys: ['gaming-monitor', 'kitchen-cart', 'rolling-cart'],
      participantKeys: ['presenter', 'sofia'],
      messages: [
        {
          senderKey: 'presenter',
          attachedListingKey: 'gaming-monitor',
          body: 'I appreciate you documenting the monitor issue clearly in the thread.',
          createdAt: subtractHours(now, 6.5),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'rolling-cart',
          offerKey: 'offer-rolling-cart-sofia',
          offerEventType: 'sent',
          body: 'Sofia sent an offer.',
          createdAt: subtractHours(now, 6.2),
        },
        {
          senderKey: 'sofia',
          attachedListingKey: 'rolling-cart',
          body: 'The cart would fit perfectly in my studio. I can meet tomorrow if you still have it.',
          createdAt: subtractHours(now, 5.9),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'rolling-cart',
          body: 'It is still available for now. Tomorrow should be fine if the earlier buyer does not confirm first.',
          createdAt: subtractHours(now, 5.5),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 5.5,
        sofia: 5.8,
      },
    },
    {
      key: 'conv-air-purifier-nina',
      activeListingKey: 'air-purifier',
      linkedListingKeys: ['vanity-mirror', 'lab-stool', 'air-purifier'],
      participantKeys: ['presenter', 'nina'],
      messages: [
        {
          senderKey: 'presenter',
          attachedListingKey: 'vanity-mirror',
          body: 'The mirror pickup worked out really well, so I wanted to check back in on your newer listings too.',
          createdAt: subtractHours(now, 8.1),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'air-purifier',
          offerKey: 'offer-air-purifier-nina',
          offerEventType: 'sent',
          body: 'Nina sent an offer.',
          createdAt: subtractHours(now, 7.8),
        },
        {
          senderKey: 'nina',
          attachedListingKey: 'air-purifier',
          body: 'If the timing still works tonight, I could meet near Marston and pick it up after class.',
          createdAt: subtractHours(now, 7.4),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'air-purifier',
          body: 'I have a same-day buyer lined up, but I wanted to answer quickly in case that changes.',
          createdAt: subtractHours(now, 7.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 7.1,
        nina: 7.3,
      },
    },
    {
      key: 'conv-leo-ava-calculator',
      activeListingKey: 'graphing-calculator',
      linkedListingKeys: ['headphones', 'scooter', 'graphing-calculator'],
      participantKeys: ['leo', 'ava'],
      activePickupHubId: 'marston',
      activePickupSpecifics: 'By the ground-floor tables near the entrance.',
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'headphones',
          body: 'Sale completed. Pickup finished near Reitz and both sides confirmed the handoff.',
          createdAt: subtractHours(now, 43.8),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'headphones',
          body: 'Thanks again. The headphones were exactly what I needed for study sessions.',
          createdAt: subtractHours(now, 43.5),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'scooter',
          body: 'Also, is the scooter still available, or did somebody else beat me to it?',
          createdAt: subtractHours(now, 12.6),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'scooter',
          body: 'Still available, but I have one other person asking. I can keep you posted after the calculator meetup.',
          createdAt: subtractHours(now, 12.3),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'graphing-calculator',
          offerKey: 'offer-graphing-calculator-ava',
          offerEventType: 'sent',
          body: 'Angela Moss sent an offer.',
          createdAt: subtractHours(now, 12),
        },
        {
          senderKey: 'leo',
          attachedListingKey: 'graphing-calculator',
          body: 'That works. I can meet near Marston tomorrow between my classes.',
          createdAt: subtractHours(now, 11.7),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'graphing-calculator',
          offerKey: 'offer-graphing-calculator-ava',
          offerEventType: 'accepted',
          body: 'Leo accepted your offer.',
          createdAt: subtractHours(now, 11.4),
        },
        {
          senderKey: 'ava',
          attachedListingKey: 'graphing-calculator',
          body: 'Perfect. I will confirm again once I am walking over from Marston so the timing stays clean.',
          createdAt: subtractHours(now, 11.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        leo: 11.2,
        ava: 11.1,
      },
    },
    {
      key: 'conv-sofia-presenter',
      activeListingKey: 'kitchen-cart',
      linkedListingKeys: ['gaming-monitor', 'kitchen-cart', 'rolling-cart'],
      participantKeys: ['presenter', 'sofia'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'gaming-monitor',
          offerKey: 'offer-gaming-monitor-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 38),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'gaming-monitor',
          offerKey: 'offer-gaming-monitor-presenter',
          offerEventType: 'accepted',
          body: 'Sofia accepted your offer.',
          createdAt: subtractHours(now, 37.4),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'gaming-monitor',
          body: 'Thanks again for meeting. I noticed a cluster of dead pixels once I got back, so I wanted to document it here.',
          createdAt: subtractHours(now, 35.8),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'gaming-monitor',
          body: 'Problem reported after the handoff. Both submissions are preserved for follow-up.',
          createdAt: subtractHours(now, 35.4),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'kitchen-cart',
          offerKey: 'offer-kitchen-cart-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 10.2),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'rolling-cart',
          body: 'Also, if you are still rearranging the studio, the rolling cart from the other thread is still around for now.',
          createdAt: subtractHours(now, 10.0),
        },
        {
          senderKey: 'sofia',
          attachedListingKey: 'kitchen-cart',
          body: 'The cart is still available. I can meet at Reitz tomorrow afternoon if you still want it.',
          createdAt: subtractHours(now, 9.8),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 9.9,
        sofia: 10.2,
      },
    },
    {
      key: 'conv-nina-presenter',
      activeListingKey: 'lab-stool',
      linkedListingKeys: ['vanity-mirror', 'lab-stool', 'air-purifier'],
      participantKeys: ['presenter', 'nina'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'vanity-mirror',
          offerKey: 'offer-vanity-mirror-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 29),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'vanity-mirror',
          offerKey: 'offer-vanity-mirror-presenter',
          offerEventType: 'accepted',
          body: 'Nina accepted your offer.',
          createdAt: subtractHours(now, 28.4),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'vanity-mirror',
          body: 'Sale completed. Both sides confirmed the handoff.',
          createdAt: subtractHours(now, 26.6),
        },
        {
          senderKey: 'system',
          attachedListingKey: 'lab-stool',
          offerKey: 'offer-lab-stool-presenter',
          offerEventType: 'sent',
          body: 'Tyrell sent an offer.',
          createdAt: subtractHours(now, 8.6),
        },
        {
          senderKey: 'presenter',
          attachedListingKey: 'air-purifier',
          body: 'The purifier from your other listing still comes up in my apartment conversations, so I figured I would ask about the stool too.',
          createdAt: subtractHours(now, 8.4),
        },
        {
          senderKey: 'nina',
          attachedListingKey: 'lab-stool',
          body: 'The stool is still available and I can probably meet near Architecture tomorrow morning.',
          createdAt: subtractHours(now, 8.2),
        },
      ],
      lastReadHoursAgoByParticipant: {
        presenter: 8.3,
        nina: 8.2,
      },
    },
    {
      key: 'conv-monitor-stand-ethan',
      activeListingKey: 'monitor-stand',
      participantKeys: ['ethan', 'cameron'],
      messages: [
        {
          senderKey: 'system',
          attachedListingKey: 'monitor-stand',
          offerKey: 'offer-monitor-stand-ethan',
          offerEventType: 'sent',
          body: 'Ethan sent an offer.',
          createdAt: subtractHours(now, 6.8),
        },
        {
          senderKey: 'cameron',
          attachedListingKey: 'monitor-stand',
          body: 'That seems reasonable. One foot pad is missing, but it still sits level enough. I am finishing class now and will answer later if nobody blows up my phone first.',
          createdAt: subtractHours(now, 6.4),
        },
        {
          senderKey: 'ethan',
          attachedListingKey: 'monitor-stand',
          body: 'No rush. I can pick up tomorrow if it helps.',
          createdAt: subtractHours(now, 6.1),
        },
      ],
      lastReadHoursAgoByParticipant: {
        ethan: 6.1,
        cameron: 6.3,
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
      meetupHubId: 'library-west',
      ...schedule(0, '16:30'),
      paymentMethod: 'cash',
      message: addFiller('I can pick this up fast if it is still available today.', OFFER_MESSAGE_VARIANTS),
      status: 'declined',
      createdAt: subtractHours(now, 30),
    },
    {
      key: 'offer-desk-lamp-ethan',
      listingKey: 'desk-lamp',
      buyerKey: 'ethan',
      conversationKey: 'conv-desk-lamp-ethan',
      offeredPrice: 25,
      meetupHubId: 'marston',
      ...schedule(1, '12:15'),
      paymentMethod: 'externalApp',
      message: addFiller('Happy to send payment as soon as we lock in the meetup.', OFFER_MESSAGE_VARIANTS),
      status: 'accepted',
      acceptedPickupSpecifics: 'By the tables outside',
      createdAt: subtractHours(now, 20),
    },
    {
      key: 'offer-desk-lamp-leo',
      listingKey: 'desk-lamp',
      buyerKey: 'leo',
      conversationKey: 'conv-rolling-cart-leo',
      offeredPrice: 26,
      meetupHubId: 'reitz',
      ...schedule(1, '14:00'),
      paymentMethod: 'gatorgoodsEscrow',
      message: addFiller('I can use escrow if you want the handoff to feel extra straightforward.', OFFER_MESSAGE_VARIANTS),
      status: 'declined',
      createdAt: subtractHours(now, 23),
    },
    {
      key: 'offer-desk-lamp-noah',
      listingKey: 'desk-lamp',
      buyerKey: 'noah',
      conversationKey: 'conv-mini-fridge-noah',
      offeredPrice: 23,
      meetupHubId: 'library-west',
      ...schedule(-1, '17:00'),
      paymentMethod: 'cash',
      message: 'If the earlier buyers fall through, I can grab the lamp late and message when I am actually close. I do not lock in exact minutes until I am moving.',
      status: 'declined',
      createdAt: subtractHours(now, 32.2),
    },
    {
      key: 'offer-mini-fridge-noah',
      listingKey: 'mini-fridge',
      buyerKey: 'noah',
      conversationKey: 'conv-mini-fridge-noah',
      offeredPrice: 70,
      meetupHubId: 'hume-hall',
      ...schedule(0, '18:00'),
      paymentMethod: 'cash',
      message: 'I will pay asking if the pickup happens tonight, but I cannot promise an exact minute until I am already on the way.',
      status: 'pending',
      createdAt: subtractHours(now, 14),
    },
    {
      key: 'offer-mini-fridge-jasmine',
      listingKey: 'mini-fridge',
      buyerKey: 'jasmine',
      conversationKey: 'conv-presenter-jasmine',
      offeredPrice: 66,
      meetupHubId: 'hume-hall',
      ...schedule(1, '11:30'),
      paymentMethod: 'externalApp',
      message: 'I can be a backup buyer if your current pickup fails, but only if the timing is explicit. Vague plans are a waste of everybody\'s time.',
      status: 'declined',
      createdAt: subtractHours(now, 17),
    },
    {
      key: 'offer-sublease-presenter',
      listingKey: 'sublease-room',
      buyerKey: 'presenter',
      conversationKey: 'conv-presenter-jasmine',
      offeredPrice: 740,
      meetupHubId: 'honors-village',
      ...schedule(1, '17:30'),
      paymentMethod: 'gatorgoodsEscrow',
      message: 'I am interested in a quick walkthrough and can move fast if it is the right fit.',
      status: 'pending',
      createdAt: subtractHours(now, 11),
    },
    {
      key: 'offer-storage-drawers-presenter',
      listingKey: 'storage-drawers',
      buyerKey: 'presenter',
      conversationKey: 'conv-presenter-jasmine',
      offeredPrice: 32,
      meetupHubId: 'turlington-hall',
      ...schedule(0, '14:00'),
      paymentMethod: 'cash',
      message: addFiller('I can grab the drawers between classes if they are still available.', OFFER_MESSAGE_VARIANTS),
      status: 'accepted',
      acceptedPickupSpecifics: 'Near the bus loop benches.',
      createdAt: subtractHours(now, 9.9),
    },
    {
      key: 'offer-standing-desk-presenter',
      listingKey: 'standing-desk',
      buyerKey: 'presenter',
      conversationKey: 'conv-presenter-jasmine',
      offeredPrice: 100,
      meetupHubId: 'honors-village',
      ...schedule(-1, '18:30'),
      paymentMethod: 'externalApp',
      message: addFiller('I can pick up the standing desk tonight if that helps you clear space before the weekend.', OFFER_MESSAGE_VARIANTS),
      status: 'accepted',
      acceptedPickupSpecifics: 'Outside the west tower lobby.',
      createdAt: subtractHours(now, 35),
    },
    {
      key: 'offer-backpack-presenter',
      listingKey: 'backpack',
      buyerKey: 'presenter',
      conversationKey: 'conv-backpack-presenter',
      offeredPrice: 30,
      meetupHubId: 'turlington-hall',
      ...schedule(1, '15:00'),
      paymentMethod: 'cash',
      message: 'If the current buyer passes, I can meet quickly between classes.',
      status: 'declined',
      createdAt: subtractHours(now, 27),
    },
    {
      key: 'offer-textbook-bundle-presenter',
      listingKey: 'textbook-bundle',
      buyerKey: 'presenter',
      conversationKey: 'conv-backpack-presenter',
      offeredPrice: 50,
      meetupHubId: 'marston',
      ...schedule(1, '13:00'),
      paymentMethod: 'cash',
      message: 'I am still considering the set if it has not moved yet. If it is gone, I assume it went to someone decisive.',
      status: 'pending',
      createdAt: subtractHours(now, 28.4),
    },
    {
      key: 'offer-board-game-ava',
      listingKey: 'board-game',
      buyerKey: 'ava',
      conversationKey: 'conv-stroller-ava',
      offeredPrice: 20,
      meetupHubId: 'broward',
      ...schedule(-1, '19:00'),
      paymentMethod: 'externalApp',
      message: 'I can do a quick pickup after class if that still works for you.',
      status: 'accepted',
      acceptedPickupSpecifics: 'Outside the main Broward Hall doors.',
      createdAt: subtractHours(now, 42.3),
    },
    {
      key: 'offer-stroller-ava-low',
      listingKey: 'stroller-organizer',
      buyerKey: 'ava',
      conversationKey: 'conv-stroller-ava',
      offeredPrice: 14,
      meetupHubId: 'honors-village',
      ...schedule(1, '13:00'),
      paymentMethod: 'externalApp',
      message: 'Starting a little lower in case you want the pickup handled fast and cleanly.',
      status: 'declined',
      createdAt: subtractHours(now, 8),
    },
    {
      key: 'offer-stroller-ava-updated',
      listingKey: 'stroller-organizer',
      buyerKey: 'ava',
      conversationKey: 'conv-stroller-ava',
      offeredPrice: 17,
      meetupHubId: 'honors-village',
      ...schedule(1, '13:00'),
      paymentMethod: 'cash',
      message: 'I sent an updated offer that is closer to asking price if that helps us close this out.',
      status: 'pending',
      createdAt: subtractHours(now, 7.1),
    },
    {
      key: 'offer-air-purifier-cameron',
      listingKey: 'air-purifier',
      buyerKey: 'cameron',
      conversationKey: 'conv-presenter-cameron',
      offeredPrice: 48,
      meetupHubId: 'marston',
      ...schedule(0, '17:45'),
      paymentMethod: 'cash',
      message: 'I can come by tonight if you are actually there. Quick handoff only, and I will message when I am moving.',
      status: 'accepted',
      acceptedPickupSpecifics: 'North entrance under the shade trees.',
      createdAt: subtractHours(now, 6.5),
    },
    {
      key: 'offer-rolling-cart-cameron',
      listingKey: 'rolling-cart',
      buyerKey: 'cameron',
      conversationKey: 'conv-presenter-cameron',
      offeredPrice: 21,
      meetupHubId: 'reitz',
      ...schedule(1, '13:30'),
      paymentMethod: 'externalApp',
      message: 'If the purifier pickup actually happens and you still have the cart tomorrow, I might take that too. No holds.',
      status: 'pending',
      createdAt: subtractHours(now, 4.7),
    },
    {
      key: 'offer-air-purifier-ava',
      listingKey: 'air-purifier',
      buyerKey: 'ava',
      conversationKey: 'conv-air-purifier-ava',
      offeredPrice: 45,
      meetupHubId: 'marston',
      ...schedule(0, '18:15'),
      paymentMethod: 'cash',
      message: 'I could still meet this evening if the earlier buyer falls through. Just keep me posted and keep it honest.',
      status: 'declined',
      createdAt: subtractHours(now, 8.2),
    },
    {
      key: 'offer-mini-fridge-ava',
      listingKey: 'mini-fridge',
      buyerKey: 'ava',
      conversationKey: 'conv-mini-fridge-ava',
      offeredPrice: 68,
      meetupHubId: 'hume-hall',
      ...schedule(0, '19:30'),
      paymentMethod: 'cash',
      message: 'I can swing by tonight if the current buyer changes plans. I would rather settle it in one message than ten.',
      status: 'pending',
      createdAt: subtractHours(now, 9.5),
    },
    {
      key: 'offer-mini-fridge-cameron',
      listingKey: 'mini-fridge',
      buyerKey: 'cameron',
      conversationKey: 'conv-mini-fridge-cameron',
      offeredPrice: 63,
      meetupHubId: 'hume-hall',
      ...schedule(1, '16:15'),
      paymentMethod: 'externalApp',
      message: 'Sending a lower first pass because I am not paying full price unless I can see it first and I am not waiting around all afternoon.',
      status: 'declined',
      createdAt: subtractHours(now, 10.4),
    },
    {
      key: 'offer-rolling-cart-leo',
      listingKey: 'rolling-cart',
      buyerKey: 'leo',
      conversationKey: 'conv-rolling-cart-leo',
      offeredPrice: 22,
      meetupHubId: 'reitz',
      ...schedule(1, '12:45'),
      paymentMethod: 'cash',
      message: 'I could use the cart for cables and lab gear. Happy to meet at Reitz tomorrow if it is still available.',
      status: 'pending',
      createdAt: subtractHours(now, 5.8),
    },
    {
      key: 'offer-mini-fridge-priya',
      listingKey: 'mini-fridge',
      buyerKey: 'priya',
      conversationKey: 'conv-mini-fridge-priya',
      offeredPrice: 69,
      meetupHubId: 'hume-hall',
      ...schedule(1, '14:30'),
      paymentMethod: 'externalApp',
      message: 'If your current buyer falls through, I can pick this up tomorrow and keep the handoff easy.',
      status: 'pending',
      createdAt: subtractHours(now, 7.3),
    },
    {
      key: 'offer-mini-fridge-black-priya',
      listingKey: 'mini-fridge-black',
      buyerKey: 'priya',
      conversationKey: 'conv-mini-fridge-black-priya',
      offeredPrice: 60,
      meetupHubId: 'marston',
      ...schedule(1, '12:30'),
      paymentMethod: 'cash',
      message: 'I can meet between classes tomorrow if you want this moved quickly.',
      status: 'pending',
      createdAt: subtractHours(now, 8.4),
    },
    {
      key: 'offer-mini-fridge-retro-cameron',
      listingKey: 'mini-fridge-retro',
      buyerKey: 'cameron',
      conversationKey: 'conv-mini-fridge-retro-cameron',
      offeredPrice: 79,
      meetupHubId: 'reitz',
      ...schedule(1, '15:45'),
      paymentMethod: 'externalApp',
      message: 'I can meet after studio traffic dies down if it still exists by then. If I am delayed, I will ping you when I am close.',
      status: 'pending',
      createdAt: subtractHours(now, 5.9),
    },
    {
      key: 'offer-mini-fridge-freezer-ethan',
      listingKey: 'mini-fridge-freezer',
      buyerKey: 'ethan',
      conversationKey: 'conv-mini-fridge-freezer-ethan',
      offeredPrice: 78,
      meetupHubId: 'marston',
      ...schedule(1, '13:15'),
      paymentMethod: 'cash',
      message: 'I can pay asking and meet near Marston tomorrow if we lock the timing in now.',
      status: 'accepted',
      acceptedPickupSpecifics: 'North entrance by the bus loop benches.',
      createdAt: subtractHours(now, 4.4),
    },
    {
      key: 'offer-rolling-cart-sofia',
      listingKey: 'rolling-cart',
      buyerKey: 'sofia',
      conversationKey: 'conv-rolling-cart-sofia',
      offeredPrice: 23,
      meetupHubId: 'reitz',
      ...schedule(1, '15:15'),
      paymentMethod: 'cash',
      message: 'The cart would work perfectly in my studio. I can meet tomorrow if it is still around.',
      status: 'pending',
      createdAt: subtractHours(now, 6.2),
    },
    {
      key: 'offer-air-purifier-nina',
      listingKey: 'air-purifier',
      buyerKey: 'nina',
      conversationKey: 'conv-air-purifier-nina',
      offeredPrice: 47,
      meetupHubId: 'marston',
      ...schedule(0, '18:30'),
      paymentMethod: 'cash',
      message: 'If the same-day buyer drops, I could meet near Marston tonight and keep this simple.',
      status: 'declined',
      createdAt: subtractHours(now, 7.8),
    },
    {
      key: 'offer-graphing-calculator-ava',
      listingKey: 'graphing-calculator',
      buyerKey: 'ava',
      conversationKey: 'conv-leo-ava-calculator',
      offeredPrice: 56,
      meetupHubId: 'marston',
      ...schedule(1, '11:45'),
      paymentMethod: 'cash',
      message: 'I can meet between classes and bring exact cash if we lock in the time.',
      status: 'accepted',
      acceptedPickupSpecifics: 'By the ground-floor tables near the entrance.',
      createdAt: subtractHours(now, 12),
    },
    {
      key: 'offer-gaming-monitor-presenter',
      listingKey: 'gaming-monitor',
      buyerKey: 'presenter',
      conversationKey: 'conv-sofia-presenter',
      offeredPrice: 110,
      meetupHubId: 'marston',
      ...schedule(-1, '18:15'),
      paymentMethod: 'externalApp',
      message: addFiller('I can meet after work and handle the handoff quickly if the monitor still looks good.', OFFER_MESSAGE_VARIANTS),
      status: 'convertedToTransaction',
      acceptedPickupSpecifics: 'Outside the side entrance facing the bike racks.',
      createdAt: subtractHours(now, 38),
    },
    {
      key: 'offer-kitchen-cart-presenter',
      listingKey: 'kitchen-cart',
      buyerKey: 'presenter',
      conversationKey: 'conv-sofia-presenter',
      offeredPrice: 44,
      meetupHubId: 'reitz',
      ...schedule(1, '15:30'),
      paymentMethod: 'cash',
      message: addFiller('The cart would work well in my apartment if it is still available tomorrow.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 10.2),
    },
    {
      key: 'offer-vanity-mirror-presenter',
      listingKey: 'vanity-mirror',
      buyerKey: 'presenter',
      conversationKey: 'conv-nina-presenter',
      offeredPrice: 40,
      meetupHubId: 'turlington-hall',
      ...schedule(-1, '17:15'),
      paymentMethod: 'cash',
      message: addFiller('I can meet tonight and carry the mirror back right away.', OFFER_MESSAGE_VARIANTS),
      status: 'convertedToTransaction',
      acceptedPickupSpecifics: 'Outside the Architecture building courtyard.',
      createdAt: subtractHours(now, 29),
    },
    {
      key: 'offer-lab-stool-presenter',
      listingKey: 'lab-stool',
      buyerKey: 'presenter',
      conversationKey: 'conv-nina-presenter',
      offeredPrice: 36,
      meetupHubId: 'turlington-hall',
      ...schedule(1, '10:30'),
      paymentMethod: 'cash',
      message: addFiller('I could pick up the stool tomorrow morning if that timing is easiest.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 8.6),
    },
    {
      key: 'offer-monitor-stand-ethan',
      listingKey: 'monitor-stand',
      buyerKey: 'ethan',
      conversationKey: 'conv-monitor-stand-ethan',
      offeredPrice: 18,
      meetupHubId: 'reitz',
      ...schedule(1, '14:15'),
      paymentMethod: 'cash',
      message: addFiller('Sending an offer in case the stand is still around tomorrow.', OFFER_MESSAGE_VARIANTS),
      status: 'pending',
      createdAt: subtractHours(now, 6.8),
    },
  ];

  const transactions = [
    {
      key: 'transaction-desk-lamp-ethan',
      offerKey: 'offer-desk-lamp-ethan',
      pickupSpecifics: 'Ground floor entrance by the benches.',
      status: 'scheduled',
      buyerDecision: '',
      sellerDecision: '',
      createdAt: subtractHours(now, 18.8),
      updatedAt: subtractHours(now, 17.7),
    },
    {
      key: 'transaction-storage-drawers-presenter',
      offerKey: 'offer-storage-drawers-presenter',
      pickupSpecifics: 'Near the bus loop benches.',
      status: 'scheduled',
      buyerDecision: '',
      sellerDecision: '',
      createdAt: subtractHours(now, 9.6),
      updatedAt: subtractHours(now, 9.6),
    },
    {
      key: 'transaction-air-purifier-cameron',
      offerKey: 'offer-air-purifier-cameron',
      pickupSpecifics: 'North entrance under the shade trees.',
      status: 'buyerConfirmed',
      buyerDecision: 'confirmed',
      sellerDecision: '',
      buyerReviewedAt: subtractHours(now, 2.2),
      buyerReview: buildBuyerReview({
        submittedAt: subtractHours(now, 2.2),
        decision: 'confirmed',
        reliability: 5,
        accuracy: 5,
        responsiveness: 4,
        safety: 5,
        details: 'Tyrell showed up on time, the purifier matched the listing, and nobody wasted anybody\'s night.',
      }),
      createdAt: subtractHours(now, 5.6),
      updatedAt: subtractHours(now, 2.2),
    },
    {
      key: 'transaction-graphing-calculator-ava',
      offerKey: 'offer-graphing-calculator-ava',
      pickupSpecifics: 'By the ground-floor tables near the entrance.',
      status: 'sellerConfirmed',
      buyerDecision: '',
      sellerDecision: 'confirmed',
      sellerReviewedAt: subtractHours(now, 1.4),
      sellerReview: buildSellerReview({
        submittedAt: subtractHours(now, 1.4),
        decision: 'confirmed',
        reliability: 5,
        responsiveness: 4,
        safety: 5,
        details: 'Angela kept the timing organized and replied quickly.',
      }),
      createdAt: subtractHours(now, 11.4),
      updatedAt: subtractHours(now, 1.4),
    },
    {
      key: 'transaction-standing-desk-presenter',
      offerKey: 'offer-standing-desk-presenter',
      pickupSpecifics: 'Outside the west tower lobby.',
      status: 'completed',
      buyerDecision: 'confirmed',
      sellerDecision: 'confirmed',
      buyerReviewedAt: subtractHours(now, 8.95),
      sellerReviewedAt: subtractHours(now, 8.9),
      buyerReview: buildBuyerReview({
        submittedAt: subtractHours(now, 8.95),
        decision: 'confirmed',
        reliability: 5,
        accuracy: 5,
        responsiveness: 4,
        safety: 5,
        details: 'Desk matched the photos and the pickup stayed simple.',
      }),
      sellerReview: buildSellerReview({
        submittedAt: subtractHours(now, 8.9),
        decision: 'confirmed',
        reliability: 5,
        responsiveness: 5,
        safety: 5,
        details: 'Tyrell arrived exactly when expected and the desk was moved in one trip.',
      }),
      createdAt: subtractHours(now, 35),
      updatedAt: subtractHours(now, 8.9),
    },
    {
      key: 'transaction-board-game-ava',
      offerKey: 'offer-board-game-ava',
      pickupSpecifics: 'Outside the main Broward Hall doors.',
      status: 'completed',
      buyerDecision: 'confirmed',
      sellerDecision: 'confirmed',
      buyerReviewedAt: subtractHours(now, 39.7),
      sellerReviewedAt: subtractHours(now, 39.5),
      buyerReview: buildBuyerReview({
        submittedAt: subtractHours(now, 39.7),
        decision: 'confirmed',
        reliability: 5,
        accuracy: 5,
        responsiveness: 4,
        safety: 5,
        details: 'Everything was there and the meetup felt clean and well-organized.',
      }),
      sellerReview: buildSellerReview({
        submittedAt: subtractHours(now, 39.5),
        decision: 'confirmed',
        reliability: 5,
        responsiveness: 5,
        safety: 5,
        details: 'Angela was on time and the exchange stayed straightforward.',
      }),
      createdAt: subtractHours(now, 42.3),
      updatedAt: subtractHours(now, 39.5),
    },
    {
      key: 'transaction-gaming-monitor-presenter',
      offerKey: 'offer-gaming-monitor-presenter',
      pickupSpecifics: 'Outside the side entrance facing the bike racks.',
      status: 'problemReported',
      buyerDecision: 'problemReported',
      sellerDecision: 'confirmed',
      buyerReviewedAt: subtractHours(now, 35.8),
      sellerReviewedAt: subtractHours(now, 35.5),
      buyerReview: buildBuyerReview({
        submittedAt: subtractHours(now, 35.8),
        decision: 'problemReported',
        reliability: 4,
        accuracy: 2,
        responsiveness: 4,
        safety: 5,
        details: 'The monitor worked, but there was a dead-pixel cluster that was not visible in the photos.',
      }),
      sellerReview: buildSellerReview({
        submittedAt: subtractHours(now, 35.5),
        decision: 'confirmed',
        reliability: 5,
        responsiveness: 4,
        safety: 5,
        details: 'Tyrell arrived on time and the handoff itself went smoothly from my side.',
      }),
      createdAt: subtractHours(now, 38),
      updatedAt: subtractHours(now, 35.4),
    },
    {
      key: 'transaction-vanity-mirror-presenter',
      offerKey: 'offer-vanity-mirror-presenter',
      pickupSpecifics: 'Outside the Architecture building courtyard.',
      status: 'completed',
      buyerDecision: 'confirmed',
      sellerDecision: 'confirmed',
      buyerReviewedAt: subtractHours(now, 26.8),
      sellerReviewedAt: subtractHours(now, 26.6),
      buyerReview: buildBuyerReview({
        submittedAt: subtractHours(now, 26.8),
        decision: 'confirmed',
        reliability: 5,
        accuracy: 4,
        responsiveness: 4,
        safety: 5,
        details: 'Mirror matched the photos and packed up without any issues.',
      }),
      sellerReview: buildSellerReview({
        submittedAt: subtractHours(now, 26.6),
        decision: 'confirmed',
        reliability: 5,
        responsiveness: 5,
        safety: 5,
        details: 'Tyrell communicated clearly and made the pickup easy.',
      }),
      createdAt: subtractHours(now, 29),
      updatedAt: subtractHours(now, 26.6),
    },
  ];

  const favorites = [
    {
      profileKey: 'presenter',
      listingKeys: ['scooter', 'sublease-room', 'backpack', 'kitchen-cart', 'bike-lock-bundle'],
      mergeExisting: true,
    },
    {
      profileKey: 'ava',
      listingKeys: ['desk-lamp', 'guitar', 'air-purifier'],
      mergeExisting: false,
    },
    {
      profileKey: 'leo',
      listingKeys: ['mini-fridge'],
      mergeExisting: false,
    },
    {
      profileKey: 'cameron',
      listingKeys: ['rolling-cart', 'sublease-room'],
      mergeExisting: false,
    },
    {
      profileKey: 'sofia',
      listingKeys: ['mini-fridge', 'lab-stool'],
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
    transactions,
    favorites,
    deletedListingKeys: ['shoe-rack'],
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
        transactions: 0,
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
  const deletedTransactions = await deps.models.Transaction.deleteMany({seedTag: config.seedTag});
  const deletedOffers = await deps.models.Offer.deleteMany({seedTag: config.seedTag});
  const deletedItems = await deps.models.Item.deleteMany({seedTag: config.seedTag});
  const deletedProfiles = await deps.models.Profile.deleteMany({seedTag: config.seedTag});

  return {
    mode: 'tag-only cleanup',
    removedFavoritesCount,
    deletedCounts: {
      messages: deletedMessages.deletedCount || 0,
      conversations: deletedConversations.deletedCount || 0,
      transactions: deletedTransactions.deletedCount || 0,
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

function resolveSeedListingPickup(listing) {
  const originalPickup = deriveListingPickupFields({
    pickupHubId: listing.originalPickupHubId || listing.pickupHubId,
    itemLocation: listing.originalItemLocation || listing.itemLocation,
  });
  const currentPickup = deriveListingPickupFields({
    pickupHubId: listing.pickupHubId || listing.originalPickupHubId,
    itemLocation: listing.itemLocation || listing.originalItemLocation,
  });

  return {
    originalPickup,
    currentPickup,
  };
}

function resolveSeedOfferPickup(offer) {
  return deriveOfferPickupFields({
    meetupHubId: offer.meetupHubId,
    meetupLocation: offer.meetupLocation,
  });
}

function getConversationActiveListingKey(conversation = {}) {
  return (
    conversation.activeListingKey ||
    conversation.listingKey ||
    conversation.linkedListingKeys?.[0] ||
    conversation.messages?.find((message) => message.attachedListingKey)?.attachedListingKey ||
    null
  );
}

function getConversationLinkedListingKeys(conversation = {}) {
  return uniqueStrings([
    getConversationActiveListingKey(conversation),
    conversation.listingKey,
    ...(conversation.linkedListingKeys || []),
    ...((conversation.messages || []).map((message) => message.attachedListingKey)),
  ]);
}

async function insertSeedDataset(dataset, config, deps = defaultDependencies()) {
  const now = config.now instanceof Date ? config.now : new Date(config.now || Date.now());
  const profileIdByKey = new Map();
  const listingSeedByKey = new Map(dataset.listings.map((listing) => [listing.key, listing]));
  const conversationSeedByKey = new Map(dataset.conversations.map((conversation) => [conversation.key, conversation]));
  const offerSeedByKey = new Map(dataset.offers.map((offer) => [offer.key, offer]));

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
    const {originalPickup, currentPickup} = resolveSeedListingPickup(listing);
    const createdListing = await deps.models.Item.create({
      itemName: listing.itemName,
      itemCost: listing.itemCost,
      itemCondition: listing.itemCondition,
      itemLocation: currentPickup.itemLocation,
      pickupHubId: currentPickup.pickupHubId,
      pickupArea: currentPickup.pickupArea,
      originalItemLocation: originalPickup.itemLocation,
      originalPickupHubId: originalPickup.pickupHubId,
      originalPickupArea: originalPickup.pickupArea,
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

  function resolveSeedMessageBody(message, offerSeed, listingDocument) {
    if (message?.offerEventType && offerSeed) {
      const buyerProfile = dataset.profilesByKey[offerSeed.buyerKey];

      return (
        formatSeedOfferEventBody(message.offerEventType, {
          buyerDisplayName: buyerProfile?.profileName || '',
          sellerDisplayName: listingDocument?.userPublishingName || '',
        }) || message.body
      );
    }

    return message?.body || '';
  }

  for (const conversation of dataset.conversations) {
    const participantIds = sortedParticipantIds(
      conversation.participantKeys.map((participantKey) => profileIdByKey.get(participantKey))
    );
    const activeListingKey = getConversationActiveListingKey(conversation);
    const linkedListingKeys = getConversationLinkedListingKeys(conversation);
    const linkedListingIds = linkedListingKeys
      .map((listingKey) => itemIdByKey.get(listingKey))
      .filter(Boolean);
    const activeListingId = activeListingKey ? itemIdByKey.get(activeListingKey) || null : null;
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const lastMessageOfferSeed = lastMessage?.offerKey ? offerSeedByKey.get(lastMessage.offerKey) : null;
    const lastMessageListingDocument = lastMessageOfferSeed ? itemByKey.get(lastMessageOfferSeed.listingKey) : null;
    const createdConversation = await deps.models.Conversation.create({
      participantIds,
      linkedListingIds,
      activeListingId,
      activePickupHubId: conversation.activePickupHubId || null,
      activePickupSpecifics: conversation.activePickupSpecifics || '',
      lastMessageText: resolveSeedMessageBody(lastMessage, lastMessageOfferSeed, lastMessageListingDocument),
      lastMessageAt: lastMessage.createdAt,
      lastReadAtByUser: buildLastReadAtMap(conversation, dataset, now),
      seedTag: config.seedTag,
      createdAt: conversation.messages[0]?.createdAt || now,
      updatedAt: lastMessage.createdAt,
    });

    conversationIdByKey.set(conversation.key, createdConversation._id);

    for (const message of conversation.messages) {
      const attachedListingKey = message.attachedListingKey || activeListingKey || null;
      const attachedListingId = attachedListingKey ? itemIdByKey.get(attachedListingKey) || null : null;
      const attachedListing = attachedListingKey ? listingSeedByKey.get(attachedListingKey) : null;
      const offerSeed = message.offerKey ? offerSeedByKey.get(message.offerKey) : null;
      const resolvedOfferPickup = offerSeed ? resolveSeedOfferPickup(offerSeed) : null;
      const buyerProfile = offerSeed ? dataset.profilesByKey[offerSeed.buyerKey] : null;
      const listingDocument = offerSeed ? itemByKey.get(offerSeed.listingKey) : null;
      const resolvedMessageBody = resolveSeedMessageBody(message, offerSeed, listingDocument);
      await deps.models.Message.create({
        conversationId: createdConversation._id,
        senderClerkUserId: message.senderKey === 'system' ? 'system' : profileIdByKey.get(message.senderKey),
        body: resolvedMessageBody,
        attachedListingId,
        attachedListingTitle: attachedListing?.itemName || '',
        attachedListingImageUrl: attachedListing?.itemPicture || '',
        offerSnapshot: offerSeed ? {
          offerId: null,
          eventType: message.offerEventType || '',
          status: offerSeed.status,
          offeredPrice: offerSeed.offeredPrice,
          buyerClerkUserId: profileIdByKey.get(offerSeed.buyerKey) || '',
          buyerDisplayName: buyerProfile?.profileName || 'Buyer',
          sellerClerkUserId: listingDocument?.userPublishingID || '',
          paymentMethod: offerSeed.paymentMethod,
          meetupDate: offerSeed.meetupDate,
          meetupTime: offerSeed.meetupTime,
          meetupHubId: resolvedOfferPickup?.meetupHubId || '',
          meetupLocation: resolvedOfferPickup?.meetupLocation || '',
        } : null,
        seedTag: config.seedTag,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      });
    }
  }

  const offerIdByKey = new Map();
  const offerDocumentByKey = new Map();

  for (const offer of dataset.offers) {
    const buyerProfile = dataset.profilesByKey[offer.buyerKey];
    const listing = itemByKey.get(offer.listingKey);
    const resolvedMeetup = resolveSeedOfferPickup(offer);
    const createdOffer = await deps.models.Offer.create({
      listingId: itemIdByKey.get(offer.listingKey),
      buyerClerkUserId: profileIdByKey.get(offer.buyerKey),
      buyerDisplayName: buyerProfile.profileName,
      sellerClerkUserId: listing.userPublishingID,
      conversationId: conversationIdByKey.get(offer.conversationKey),
      offeredPrice: offer.offeredPrice,
      meetupHubId: resolvedMeetup.meetupHubId,
      meetupArea: resolvedMeetup.meetupArea,
      meetupLocation: resolvedMeetup.meetupLocation,
      meetupDate: offer.meetupDate,
      meetupTime: offer.meetupTime,
      paymentMethod: offer.paymentMethod,
      message: offer.message,
      status: offer.status,
      seedTag: config.seedTag,
      createdAt: offer.createdAt,
      updatedAt: offer.createdAt,
    });

    offerIdByKey.set(offer.key, createdOffer._id);
    offerDocumentByKey.set(offer.key, createdOffer);

    if (['accepted', 'convertedToTransaction'].includes(offer.status)) {
      const conversationId = conversationIdByKey.get(offer.conversationKey);
      const conversationSeed = conversationSeedByKey.get(offer.conversationKey);
      const conversationActiveListingKey = getConversationActiveListingKey(conversationSeed);
      await deps.models.Item.findByIdAndUpdate(itemIdByKey.get(offer.listingKey), {
        reservedOfferId: createdOffer._id,
      });

      const nextConversationFields = {};
      const explicitPickupHubId = conversationSeed?.activePickupHubId || null;
      const explicitPickupSpecifics = conversationSeed?.activePickupSpecifics || '';
      const shouldApplyAcceptedPickupToConversation =
        explicitPickupHubId ||
        explicitPickupSpecifics ||
        (conversationActiveListingKey && conversationActiveListingKey === offer.listingKey);

      if (shouldApplyAcceptedPickupToConversation) {
        nextConversationFields.activePickupHubId = explicitPickupHubId || resolvedMeetup.meetupHubId || null;
        nextConversationFields.activePickupSpecifics = explicitPickupSpecifics || offer.acceptedPickupSpecifics || '';
      }

      if (Object.keys(nextConversationFields).length > 0) {
        await deps.models.Conversation.findByIdAndUpdate(conversationId, nextConversationFields);
      }
    }
  }

  for (const transaction of dataset.transactions || []) {
    const offerSeed = offerSeedByKey.get(transaction.offerKey);
    const offerDocument = offerDocumentByKey.get(transaction.offerKey);
    const listingDocument = offerSeed ? itemByKey.get(offerSeed.listingKey) : null;
    const conversationId = offerSeed ? conversationIdByKey.get(offerSeed.conversationKey) : null;
    const resolvedMeetup = offerSeed ? resolveSeedOfferPickup(offerSeed) : null;

    if (!offerSeed || !offerDocument || !listingDocument) {
      continue;
    }

    await deps.models.Transaction.findOneAndUpdate(
      {offerId: offerDocument._id},
      {
        $set: {
          listingId: listingDocument._id,
          conversationId,
          buyerClerkUserId: profileIdByKey.get(offerSeed.buyerKey),
          sellerClerkUserId: listingDocument.userPublishingID,
          acceptedTerms: {
            price: offerSeed.offeredPrice,
            paymentMethod: offerSeed.paymentMethod,
            meetupHubId: resolvedMeetup?.meetupHubId || '',
            meetupLocation: resolvedMeetup?.meetupLocation || '',
            pickupSpecifics: transaction.pickupSpecifics || offerSeed.acceptedPickupSpecifics || '',
            meetupDate: offerSeed.meetupDate,
            meetupTime: offerSeed.meetupTime,
          },
          status: transaction.status,
          buyerDecision: transaction.buyerDecision || '',
          sellerDecision: transaction.sellerDecision || '',
          buyerReviewedAt: transaction.buyerReviewedAt || null,
          sellerReviewedAt: transaction.sellerReviewedAt || null,
          buyerReview: transaction.buyerReview || null,
          sellerReview: transaction.sellerReview || null,
          seedTag: config.seedTag,
          createdAt: transaction.createdAt || offerSeed.createdAt,
          updatedAt: transaction.updatedAt || transaction.createdAt || offerSeed.createdAt,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );

    if (transaction.status === 'completed' || transaction.status === 'problemReported') {
      await deps.models.Offer.findByIdAndUpdate(offerDocument._id, {
        $set: {
          status: 'convertedToTransaction',
        },
      });

      await deps.models.Item.findByIdAndUpdate(listingDocument._id, {
        $set: {
          status: 'sold',
          reservedOfferId: offerDocument._id,
        },
      });
    } else if (listingDocument.status === 'reserved') {
      await deps.models.Item.findByIdAndUpdate(listingDocument._id, {
        $set: {
          reservedOfferId: offerDocument._id,
        },
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

  const deletedListingIds = (dataset.deletedListingKeys || [])
    .map((listingKey) => itemIdByKey.get(listingKey))
    .filter(Boolean);

  if (deletedListingIds.length > 0) {
    await deps.models.Item.deleteMany({
      _id: {$in: deletedListingIds},
    });
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
      items: dataset.listings.length - deletedListingIds.length,
      offers: dataset.offers.length,
      transactions: (dataset.transactions || []).length,
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
  logger.log(`  Transactions: ${summary.counts.transactions}`);
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
  logger.log('  PRESENTER_CLERK_SECRET_KEY=sk_test_presenter SECONDARY_CLERK_SECRET_KEY=sk_test_secondary DEMO_USER_ASSIGNMENTS=\'[{"email":"you@ufl.edu","clerkSecretKeyEnv":"PRESENTER_CLERK_SECRET_KEY"},{"email":"friend@ufl.edu","clerkSecretKeyEnv":"SECONDARY_CLERK_SECRET_KEY"}]\' npm run seed:demo');
  logger.log('  DEMO_USER_EMAIL=you@ufl.edu CLERK_SECRET_KEY=sk_test_xxx npm run seed:demo');
  logger.log('  PRESENTER_CLERK_SECRET_KEY=sk_test_presenter DEMO_USER_MAP=\'{"presenter":{"email":"you@ufl.edu","clerkSecretKeyEnv":"PRESENTER_CLERK_SECRET_KEY"},"ava":{"id":"user_ava123"}}\' npm run seed:demo');
  logger.log('  SEED_FULL_RESET=true npm run seed:demo');
}

async function seedDemoData({
  env = process.env,
  fetchImpl = global.fetch,
  deps = defaultDependencies(),
} = {}) {
  const config = buildSeedConfigFromEnv(env);
  config.profileIdentityOverrides = await resolveSeedProfileIdentities(config, {fetchImpl});
  config.presenterIdentity = config.profileIdentityOverrides.presenter || {
    profileID: 'demo_seller',
    profileName: PRESENTER_PROFILE_DEFAULTS.profileName,
    profilePicture: PRESENTER_PROFILE_DEFAULTS.profilePicture,
    source: 'fallback',
    email: '',
  };
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
  parseDemoUserAssignments,
  parseDemoUserMap,
  printSeedSummary,
  resolveClerkUserByEmail,
  resolveClerkUserById,
  resolveSeedProfileIdentities,
  resolvePresenterIdentity,
  seedDemoData,
};
