import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../ui';

function ListingMedia({item}) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.title}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm font-semibold uppercase tracking-[0.18em] text-app-muted">
      No photo
    </div>
  );
}

function FavCard({
  items = [],
  removingListingId = '',
  onRemoveFavorite,
  emptyTitle = 'No favorites saved yet',
  emptyDescription = 'Favorite listings you want to revisit, and they will show up here.',
}) {
  if (items.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
          Favorites
        </p>
        <h3 className="text-xl font-semibold text-white">{emptyTitle}</h3>
        <p className="text-sm leading-7 text-app-soft">{emptyDescription}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card
          key={item.id}
          as="article"
          className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              to={`/items/${item.id}`}
              className="block h-32 w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-app-surface/70 sm:w-40"
            >
              <ListingMedia item={item} />
            </Link>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-2xl font-semibold text-gatorOrange">{item.priceLabel}</p>
                <Badge condition={item.condition} />
                <Badge>{item.category}</Badge>
              </div>

              <Link
                to={`/items/${item.id}`}
                className="text-xl font-semibold tracking-tight text-white no-underline transition hover:text-gatorOrange"
              >
                {item.title}
              </Link>

              <div className="flex flex-wrap gap-3 text-sm text-app-soft">
                <span>{item.location}</span>
                <span>{item.sellerName}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            {item.sellerId ? (
              <Link to={`/profile/${item.sellerId}`} className="no-underline">
                <Button variant="ghost">View seller</Button>
              </Link>
            ) : null}

            <Link to={`/items/${item.id}`} className="no-underline">
              <Button variant="secondary">View details</Button>
            </Link>

            <Button
              variant="danger"
              loading={removingListingId === item.id}
              onClick={() => onRemoveFavorite?.(item.id, item.title)}
            >
              Remove favorite
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default FavCard;
