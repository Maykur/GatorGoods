import { useUser } from '@clerk/react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/HomePage/ProductCard.js';
import { AppIcon, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Skeleton } from '../components/ui';
import { getCategoryIcon } from '../components/ui/Icon';
import { getCachedListings, getListingsPage, hasCachedListings } from '../lib/listingsApi';
import { getPickupLocationLabels } from '../lib/pickupHubs';
import { LISTING_CATEGORIES, toListingCardViewModel } from '../lib/viewModels';
import { cn } from '../lib/ui';

const PAGE_SIZE = 9;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'title', label: 'Title: A to Z' },
];

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }

  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, startPage + 2);
  const adjustedStart = Math.max(1, endPage - 2);

  return Array.from({length: endPage - adjustedStart + 1}, (_, index) => adjustedStart + index);
}

function ListingGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} padding="none" className="overflow-hidden">
          <Skeleton className="aspect-[3/2] rounded-none sm:aspect-[4/3]" />
          <div className="space-y-2 p-3 sm:space-y-3 sm:p-5">
            <Skeleton className="h-6 w-20 sm:h-7 sm:w-24" />
            <Skeleton className="h-4 w-full sm:h-6" />
            <Skeleton className="h-4 w-24 sm:h-6 sm:w-32" />
            <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
            <Skeleton className="h-3 w-24 sm:h-4 sm:w-28" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function FeatureCard({ icon, eyebrow, title, description }) {
  return (
    <Card variant="subtle" className="space-y-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gatorOrange/20 bg-gatorOrange/10 text-gatorOrange">
        <AppIcon icon={icon} className="text-lg" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-sm leading-7 text-app-soft">
        {description}
      </p>
    </Card>
  );
}

export function HomePage({ forceSignedOutView = false }) {
  const { isLoaded, isSignedIn } = useUser();
  const shouldRenderLanding = forceSignedOutView;
  const canCreateListings = isLoaded && isSignedIn;
  const initialRequestParams = {
    page: 1,
    limit: PAGE_SIZE,
    search: '',
    category: 'All',
    pickupLocation: 'All',
    sort: 'newest',
  };
  const initialCachedResponse = !shouldRenderLanding ? getCachedListings(initialRequestParams) : null;
  const [items, setItems] = useState(() => initialCachedResponse?.items || []);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(
    () =>
      initialCachedResponse?.meta || {
        page: 1,
        limit: PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }
  );
  const [error, setError] = useState('');
  const [hasLoadedFeed, setHasLoadedFeed] = useState(Boolean(initialCachedResponse));
  const hasLoadedFeedRef = useRef(Boolean(initialCachedResponse));
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (shouldRenderLanding) {
      return undefined;
    }

    let isMounted = true;
    const requestParams = {
      page,
      limit: PAGE_SIZE,
      search: deferredSearch,
      category: selectedCategory,
      pickupLocation: selectedPickupLocation,
      sort: sortBy,
    };
    const shouldUseInitialLoading = !hasLoadedFeedRef.current && !hasCachedListings(requestParams);

    const itemFetch = async () => {
      try {
        if (isMounted) {
          if (shouldUseInitialLoading) {
            setIsLoading(true);
          } else {
            setIsRefreshing(true);
          }
        }

        const data = await getListingsPage(requestParams);

        if (!isMounted) {
          return;
        }

        setItems(Array.isArray(data.items) ? data.items : []);
        setMeta(data.meta);
        setError('');
        if (!hasLoadedFeedRef.current) {
          hasLoadedFeedRef.current = true;
          setHasLoadedFeed(true);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || 'Failed to fetch listings');
          if (!hasLoadedFeedRef.current) {
            hasLoadedFeedRef.current = true;
            setHasLoadedFeed(true);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    itemFetch();

    return () => {
      isMounted = false;
    };
  }, [deferredSearch, page, selectedCategory, selectedPickupLocation, shouldRenderLanding, sortBy]);

  if (shouldRenderLanding) {
    return (
      <section className="w-full space-y-8">
        <Card padding="lg" className="overflow-hidden">
          <PageHeader
            eyebrow="A UF Marketplace"
            icon="browse"
            title="Buy, sell, and trade around campus."
            description="Browse campus listings, message sellers, and make offers when you're ready."
            actions={
              <div className="flex flex-wrap gap-3">
                {isLoaded && isSignedIn ? (
                  <Link to="/create" className="no-underline">
                    <Button leadingIcon="createListing">Post a listing</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" className="no-underline">
                      <Button leadingIcon="createListing">Create account</Button>
                    </Link>
                    <Link to="/login" className="no-underline">
                      <Button variant="secondary" leadingIcon="profile">Log in</Button>
                    </Link>
                  </>
                )}
              </div>
            }
          />
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon="verified"
            eyebrow="Trusted Network"
            title="Made for campus pickup"
            description="Buy and sell with other UF students and keep pickup plans easy to sort out."
          />
          <FeatureCard
            icon="search"
            eyebrow="Cleaner browsing"
            title="Find the right listing faster"
            description="Search and category filters help you narrow things down without digging through clutter."
          />
          <FeatureCard
            icon="messages"
            eyebrow="Messaging first"
            title="Keep everything in one place"
            description="Your listing details, seller info, and messages stay together instead of getting lost in group chats."
          />
        </div>
      </section>
    );
  }

  const listingCards = items.map(toListingCardViewModel);
  const categoryOptions = ['All', ...LISTING_CATEGORIES];
  const pickupLocationOptions = ['All', ...getPickupLocationLabels()];
  const hasFilters =
    deferredSearch.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedPickupLocation !== 'All' ||
    sortBy !== 'newest';
  const visiblePages = getVisiblePages(meta.page, meta.totalPages);

  return (
    <section className="w-full space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        icon="browse"
        title="Browse campus listings"
        description="Search listings, filter by category, and message the seller when something looks right."
        actions={
          canCreateListings ? (
            <Link to="/create" className="no-underline">
              <Button size="sm" leadingIcon="createListing">Create listing</Button>
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className="no-underline">
                <Button size="sm" leadingIcon="createListing">Create account</Button>
              </Link>
              <Link to="/login" className="no-underline">
                <Button size="sm" variant="secondary" leadingIcon="profile">Log in</Button>
              </Link>
            </div>
          )
        }
      />

      <Card className="space-y-4 sm:space-y-5">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <Input
            id="marketplace-search"
            label="Search listings"
            leadingIcon="search"
            placeholder="Search by title, seller, location, or category"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            id="marketplace-pickup-location"
            label="Pickup location"
            leadingIcon="location"
            value={selectedPickupLocation}
            onChange={(event) => {
              setSelectedPickupLocation(event.target.value);
              setPage(1);
            }}
          >
            {pickupLocationOptions.map((location) => (
              <option key={location} value={location}>
                {location === 'All' ? 'All pickup locations' : location}
              </option>
            ))}
          </Select>
          <Select
            id="marketplace-sort"
            label="Sort by"
            leadingIcon="sort"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setPage(1);
              }}
              className={cn(
                'focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm',
                category === selectedCategory
                  ? 'border-gatorOrange/50 bg-gatorOrange/15 text-white'
                  : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
              )}
            >
              {category !== 'All' ? (
                <AppIcon icon={getCategoryIcon(category)} className="text-[0.95em]" />
              ) : null}
              {category}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-app-soft sm:text-sm">
            {meta.totalItems} {meta.totalItems === 1 ? 'listing' : 'listings'}
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
            {selectedPickupLocation !== 'All' ? `${selectedCategory !== 'All' ? ' near ' : ' in '}${selectedPickupLocation}` : ''}.
            .
          </p>
          <div className="flex items-center gap-3">
            {isRefreshing ? (
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-xs">
                Updating results...
              </p>
            ) : null}
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                leadingIcon="clear"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setSelectedPickupLocation('All');
                  setSortBy('newest');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorBanner
          title="We couldn't load the marketplace feed"
          message={`${error}. Try refreshing or come back in a moment.`}
        />
      ) : null}

      {isLoading || !hasLoadedFeed ? <ListingGridSkeleton /> : null}

      {!isLoading && hasLoadedFeed && !error && listingCards.length === 0 ? (
        <EmptyState
          icon="search"
          title="No listings match your current filters"
          description="Try a broader search, switch categories, or reset the sort and filters to see more campus listings."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                leadingIcon="reset"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setSelectedPickupLocation('All');
                  setSortBy('newest');
                  setPage(1);
                }}
              >
                Reset filters
              </Button>
              {canCreateListings ? (
                <Link to="/create" className="no-underline">
                  <Button leadingIcon="createListing">Create a listing</Button>
                </Link>
              ) : (
                <Link to="/signup" className="no-underline">
                  <Button leadingIcon="createListing">Create account to sell</Button>
                </Link>
              )}
            </div>
          }
        />
      ) : null}

      {!isLoading && hasLoadedFeed && !error && listingCards.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {listingCards.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>

          {meta.totalPages > 1 ? (
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-xs text-app-soft sm:text-sm">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon="previous"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={!meta.hasPreviousPage || isRefreshing}
                >
                  Previous
                </Button>
                {visiblePages.map((visiblePage) => (
                  <button
                    key={visiblePage}
                    type="button"
                    onClick={() => setPage(visiblePage)}
                    disabled={isRefreshing}
                    className={cn(
                      'focus-ring min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:px-4 sm:text-sm',
                      visiblePage === meta.page
                        ? 'border-gatorOrange/50 bg-gatorOrange/15 text-white'
                        : 'border-white/10 bg-white/5 text-app-soft hover:border-white/20 hover:text-white'
                    )}
                  >
                    {visiblePage}
                  </button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  trailingIcon="next"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={!meta.hasNextPage || isRefreshing}
                >
                  Next
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
