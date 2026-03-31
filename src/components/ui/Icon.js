import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faArrowUpWideShort,
  faBars,
  faBolt,
  faBullseye,
  faCamera,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCirclePlus,
  faClock,
  faComments,
  faEye,
  faHandshake,
  faHeart,
  faHouse,
  faLocationDot,
  faMagnifyingGlass,
  faMessage,
  faMoneyBillWave,
  faRotateLeft,
  faShieldHalved,
  faStar,
  faStore,
  faTag,
  faTrash,
  faUpload,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { cn } from '../../lib/ui';

export const APP_ICONS = {
  browse: faStore,
  category: faTag,
  clear: faRotateLeft,
  createListing: faCirclePlus,
  delete: faTrash,
  favorite: faHeart,
  home: faHouse,
  instagram: faInstagram,
  linkedin: faLinkedin,
  listing: faTag,
  location: faLocationDot,
  menu: faBars,
  message: faMessage,
  messages: faComments,
  next: faChevronRight,
  offers: faHandshake,
  open: faEye,
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
