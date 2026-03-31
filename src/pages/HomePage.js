import { Show, SignInButton, SignUpButton, useUser } from '@clerk/react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/HomePage/ProductCard.js';
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Skeleton } from '../components/ui';
import { LISTING_CATEGORIES, normalizeCategory, parsePriceValue, toListingCardViewModel } from '../lib/viewModels';
import { cn } from '../lib/ui';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'title', label: 'Title: A to Z' },
];

function sortItems(items, sortBy) {
  const sortedItems = [...items];

  switch (sortBy) {
    case 'price-low':
      sortedItems.sort((first, second) => parsePriceValue(first.priceLabel) - parsePriceValue(second.priceLabel));
      break;
    case 'price-high':
      sortedItems.sort((first, second) => parsePriceValue(second.priceLabel) - parsePriceValue(first.priceLabel));
      break;
    case 'title':
      sortedItems.sort((first, second) => first.title.localeCompare(second.title));
      break;
    default:
      break;
  }

  return sortedItems;
}

function buildCategoryOptions(items) {
  const presentCategories = new Set(items.map((item) => item.category));
  const orderedCategories = LISTING_CATEGORIES.filter((category) => presentCategories.has(category));
  const extraCategories = [...presentCategories]
    .filter((category) => !LISTING_CATEGORIES.includes(category))
    .sort((first, second) => first.localeCompare(second));

  return ['All', ...orderedCategories, ...extraCategories];
}

function ListingGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} padding="none" className="overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HomePage({ forceSignedOutView = false }) {
  const { isSignedIn } = useUser();
  const shouldRenderLanding = forceSignedOutView || !isSignedIn;
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (shouldRenderLanding) {
      return undefined;
    }

    let isMounted = true;

    const itemFetch = async () => {
      try {
        if (isMounted) {
          setIsLoading(true);
        }

        const response = await fetch('http://localhost:5000/items');

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        setItems(Array.isArray(data) ? data : []);
        setError('');
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || 'Failed to fetch listings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    itemFetch();

    return () => {
      isMounted = false;
    };
  }, [shouldRenderLanding]);

  if (shouldRenderLanding) {
    return (
      <section className="w-full space-y-8">
        <Card padding="lg" className="overflow-hidden">
          <PageHeader
            eyebrow="A UF Marketplace"
            title="Buy, sell, and trade around campus without the usual chaos."
            description="Browse the latest listings, make structured offers, and keep transactions centered around the UF community."
            actions={
              <div className="flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button>Create account</Button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <Button variant="secondary">Log in</Button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <Link to="/create" className="no-underline">
                    <Button>Post a listing</Button>
                  </Link>
                </Show>
              </div>
            }
          />
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="subtle" className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
              Trusted Network
            </p>
            <h2 className="text-xl font-semibold text-white">Built for campus meetups</h2>
            <p className="text-sm leading-7 text-app-soft">
              Keep buying and selling centered around a UF student community where trust and pickup logistics matter.
            </p>
          </Card>
          <Card variant="subtle" className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
              Cleaner browsing
            </p>
            <h2 className="text-xl font-semibold text-white">Find the right listing faster</h2>
            <p className="text-sm leading-7 text-app-soft">
              Search, category filters, and a calmer marketplace layout make it easier to spot the listings worth messaging about.
            </p>
          </Card>
          <Card variant="subtle" className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
              Messaging first
            </p>
            <h2 className="text-xl font-semibold text-white">Negotiate without switching tools</h2>
            <p className="text-sm leading-7 text-app-soft">
              Listings, seller identity, and direct conversation stay in one place instead of getting scattered across campus group chats.
            </p>
          </Card>
        </div>
      </section>
    );
  }

  const listingCards = items.map(toListingCardViewModel);
  const categoryOptions = buildCategoryOptions(listingCards);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredItems = sortItems(
    listingCards.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.location.toLowerCase().includes(normalizedSearch) ||
        item.sellerName.toLowerCase().includes(normalizedSearch) ||
        normalizeCategory(item.category).toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    }),
    sortBy
  );
  const hasFilters = normalizedSearch.length > 0 || selectedCategory !== 'All' || sortBy !== 'newest';

  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Browse campus listings"
        description="Search current student listings, narrow the grid by category, and jump into a seller conversation once something looks right."
        actions={
          <Link to="/create" className="no-underline">
            <Button>Create listing</Button>
          </Link>
        }
      />

      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
          <Input
            id="marketplace-search"
            label="Search listings"
            placeholder="Search by title, seller, location, or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            id="marketplace-sort"
            label="Sort by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                category === selectedCategory
                  ? 'border-gatorOrange/50 bg-gatorOrange/15 text-white'
                  : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-soft">
            {filteredItems.length} {filteredItems.length === 1 ? 'listing' : 'listings'}
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
          </p>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSortBy('newest');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      {error ? (
        <ErrorBanner
          title="We couldn't load the marketplace feed"
          message={`${error}. Try refreshing or come back in a moment.`}
        />
      ) : null}

      {isLoading ? <ListingGridSkeleton /> : null}

      {!isLoading && !error && filteredItems.length === 0 ? (
        <EmptyState
          title="No listings match your current filters"
          description="Try a broader search, switch categories, or reset the sort and filters to see more campus listings."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setSortBy('newest');
                }}
              >
                Reset filters
              </Button>
              <Link to="/create" className="no-underline">
                <Button>Create a listing</Button>
              </Link>
            </div>
          }
        />
      ) : null}

      {!isLoading && !error && filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
