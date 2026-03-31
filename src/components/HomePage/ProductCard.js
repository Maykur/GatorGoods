import { Link } from 'react-router-dom';
import { Badge, Card } from '../ui';

function ProductCard({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="no-underline">
      <Card
        variant="interactive"
        padding="none"
        className="group flex h-full flex-col overflow-hidden"
      >
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-white/10 bg-gradient-to-br from-brand-blue/12 via-app-surface/80 to-gatorOrange/12">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-app-muted">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight text-gatorOrange">
              {item.priceLabel}
            </p>
            <h2 className="min-h-[3.5rem] text-lg font-semibold leading-7 text-white">
              {item.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge condition={item.condition}>{item.condition || 'Unknown'}</Badge>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-app-soft">
              {item.category}
            </span>
          </div>
          <div className="space-y-2 text-sm text-app-soft">
            <p>{item.location}</p>
            <p>{item.sellerName}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default ProductCard;
