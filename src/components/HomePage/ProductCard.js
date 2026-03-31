import { Link } from 'react-router-dom';
import { Badge, Card, AppIcon } from '../ui';
import { getCategoryIcon } from '../ui/Icon';

function getStatusVariant(status) {
  switch (status) {
    case 'reserved':
      return 'warning';
    case 'sold':
      return 'success';
    case 'archived':
      return 'default';
    default:
      return 'info';
  }
}

function ProductCard({ item }) {
  const categoryIcon = getCategoryIcon(item.category);

  return (
    <Link to={`/items/${item.id}`} className="block no-underline">
      <Card
        variant="interactive"
        padding="none"
        className="group flex h-full min-w-0 flex-col overflow-hidden"
      >
        <div className="flex aspect-[3/2] items-center justify-center overflow-hidden border-b border-white/10 bg-gradient-to-br from-brand-blue/12 via-app-surface/80 to-gatorOrange/12 sm:aspect-[4/3]">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-sm sm:tracking-[0.2em]">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-5">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold tracking-tight text-gatorOrange sm:text-2xl">
                {item.priceLabel}
              </p>
              <Badge variant={getStatusVariant(item.status)} className="px-2.5 py-1 text-[0.65rem] sm:px-3 sm:text-xs">
                {item.statusLabel}
              </Badge>
            </div>
            <h2 className="min-h-[2.75rem] text-sm font-semibold leading-5 text-white sm:min-h-[3.5rem] sm:text-lg sm:leading-7">
              {item.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge
              condition={item.condition}
              className="px-2.5 py-1 text-[0.65rem] tracking-[0.14em] sm:px-3 sm:text-xs"
            >
              {item.condition || 'Unknown'}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-medium text-app-soft sm:px-3 sm:text-xs">
              <AppIcon icon={categoryIcon} className="text-[0.95em]" />
              {item.category}
            </span>
          </div>
          <div className="space-y-1 text-xs leading-5 text-app-soft sm:space-y-2 sm:text-sm">
            <p className="flex items-center gap-2 truncate">
              <AppIcon icon="location" className="text-[0.9em] text-app-muted" />
              <span className="truncate">{item.location}</span>
            </p>
            <p className="flex items-center gap-2 truncate">
              <AppIcon icon="seller" className="text-[0.9em] text-app-muted" />
              <span className="truncate">{item.sellerName}</span>
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default ProductCard;
