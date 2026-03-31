import { useUser } from '@clerk/react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/HomePage/ProductCard.js';
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Skeleton } from '../components/ui';
import { getCachedListings, getListingsPage, hasCachedListings } from '../lib/listingsApi';
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

export function HomePage({ forceSignedOutView = false }) {
  const { isLoaded, isSignedIn } = useUser();
  const shouldRenderLanding = forceSignedOutView;
  const canCreateListings = isLoaded && isSignedIn;
  const initialRequestParams = {
    page: 1,
    limit: PAGE_SIZE,
    search: '',
    category: 'All',
    sort: 'newest',
  };
  const initialCachedResponse = !shouldRenderLanding ? getCachedListings(initialRequestParams) : null;
  const [items, setItems] = useState(() => initialCachedResponse?.items || []);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState('All');
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
      sort: sortBy,
    };
    const shouldUseInitialLoading = !hasLoadedFeed && !hasCachedListings(requestParams);

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
        setHasLoadedFeed(true);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || 'Failed to fetch listings');
          setHasLoadedFeed(true);
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
  }, [deferredSearch, hasLoadedFeed, page, selectedCategory, shouldRenderLanding, sortBy]);

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
                {isLoaded && isSignedIn ? (
                  <Link to="/create" className="no-underline">
                    <Button>Post a listing</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/signup" className="no-underline">
                      <Button>Create account</Button>
                    </Link>
                    <Link to="/login" className="no-underline">
                      <Button variant="secondary">Log in</Button>
                    </Link>
                  </>
                )}
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
  const categoryOptions = ['All', ...LISTING_CATEGORIES];
  const hasFilters = deferredSearch.trim().length > 0 || selectedCategory !== 'All' || sortBy !== 'newest';
  const visiblePages = getVisiblePages(meta.page, meta.totalPages);

  return (
    <section className="w-full space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Browse campus listings"
            description="Search current student listings, narrow the grid by category, and jump into a seller conversation once something looks right."
        actions={
          canCreateListings ? (
            <Link to="/create" className="no-underline">
              <Button size="sm">Create listing</Button>
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className="no-underline">
                <Button size="sm">Create account</Button>
              </Link>
              <Link to="/login" className="no-underline">
                <Button size="sm" variant="secondary">Log in</Button>
              </Link>
            </div>
          )
        }
      />

      <Card className="space-y-4 sm:space-y-5">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
          <Input
            id="marketplace-search"
            label="Search listings"
            placeholder="Search by title, seller, location, or category"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            id="marketplace-sort"
            label="Sort by"
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
                'focus-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm',
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
          <p className="text-xs text-app-soft sm:text-sm">
            {meta.totalItems} {meta.totalItems === 1 ? 'listing' : 'listings'}
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
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
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
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
                  setPage(1);
                }}
              >
                Reset filters
              </Button>
              {canCreateListings ? (
                <Link to="/create" className="no-underline">
                  <Button>Create a listing</Button>
                </Link>
              ) : (
                <Link to="/signup" className="no-underline">
                  <Button>Create account to sell</Button>
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
