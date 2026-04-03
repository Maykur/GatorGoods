import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArchive,
  faArrowLeft,
  faArrowRight,
  faArrowUpWideShort,
  faFileLines,
  faBars,
  faBan,
  faBolt,
  faBullseye,
  faCamera,
  faCarSide,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCirclePlus,
  faClock,
  faComments,
  faCouch,
  faEye,
  faGamepad,
  faHandshake,
  faHeart,
  faHouse,
  faLaptop,
  faLocationDot,
  faLocationCrosshairs,
  faMagnifyingGlass,
  faMessage,
  faMoneyBillWave,
  faPen,
  faRotateLeft,
  faShieldHalved,
  faShop,
  faShirt,
  faStar,
  faStore,
  faTag,
  faTrash,
  faUpload,
  faUser,
  faUsers,
  faBox,
  faHouseChimneyWindow,
} from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { cn } from '../../lib/ui';

export const APP_ICONS = {
  browse: faStore,
  collection: faArchive,
  unavailable: faBan,
  category: faTag,
  clear: faRotateLeft,
  createListing: faCirclePlus,
  description: faFileLines,
  delete: faTrash,
  edit: faPen,
  favorite: faHeart,
  home: faHouse,
  instagram: faInstagram,
  linkedin: faLinkedin,
  listing: faTag,
  location: faLocationDot,
  locationDetails: faLocationCrosshairs,
  menu: faBars,
  message: faMessage,
  messages: faComments,
  next: faChevronRight,
  offers: faHandshake,
  open: faEye,
  outgoing: faShop,
  payment: faMoneyBillWave,
  previous: faChevronLeft,
  profile: faUser,
  rating: faStar,
  reliability: faCircleCheck,
  reset: faRotateLeft,
  responsiveness: faBolt,
  safety: faShieldHalved,
  search: faMagnifyingGlass,
  seller: faUser,
  send: faArrowRight,
  sort: faArrowUpWideShort,
  time: faClock,
  upload: faUpload,
  uploadPhoto: faCamera,
  verified: faCircleCheck,
  view: faEye,
  back: faArrowLeft,
  accuracy: faBullseye,
};

export function getCategoryIcon(category) {
  switch (category) {
    case 'Vehicles':
      return faCarSide;
    case 'Property Rentals':
      return faHouseChimneyWindow;
    case 'Apparel & Accessories':
      return faShirt;
    case 'Electronics & Computers':
      return faLaptop;
    case 'Home & Garden':
      return faCouch;
    case 'Entertainment & Hobbies':
      return faGamepad;
    case 'Family':
      return faUsers;
    case 'Miscellaneous':
      return faBox;
    default:
      return faTag;
  }
}

export function resolveAppIcon(icon) {
  if (!icon) {
    return null;
  }

  if (typeof icon === 'string') {
    return APP_ICONS[icon] || null;
  }

  return icon;
}

export function AppIcon({
  icon,
  className,
  title,
  decorative = true,
  fixedWidth = true,
  ...props
}) {
  const resolvedIcon = resolveAppIcon(icon);

  if (!resolvedIcon) {
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={resolvedIcon}
      fixedWidth={fixedWidth}
      title={title}
      className={cn('shrink-0', className)}
      aria-hidden={decorative ? 'true' : undefined}
      {...props}
    />
  );
}
