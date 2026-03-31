import { Link } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../components/ui";

export function OffersPage() {
  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Offers"
        title="Offers inbox is coming soon"
        description="We’re building a more structured way to send and review offers. For now, direct messages are still the best place to negotiate price and pickup details."
      />
      <Card variant="subtle" className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">What to do today</p>
          <p className="text-sm leading-7 text-app-soft">
            Reach out from a listing page when you want to ask a question, discuss price, or lock in a campus meetup.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">Why messaging works</p>
          <p className="text-sm leading-7 text-app-soft">
            You can keep the full conversation attached to the listing, which makes it easier to compare details and follow up later.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">What’s next</p>
          <p className="text-sm leading-7 text-app-soft">
            This space will eventually help buyers and sellers review offers, respond faster, and keep negotiations organized.
          </p>
        </div>
      </Card>
      <EmptyState
        title="Structured offers are on the way"
        description="Until then, use listing pages and direct messages to ask questions, negotiate price, and coordinate pickup with confidence."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/listings" className="no-underline">
              <Button>Browse listings</Button>
            </Link>
            <Link to="/messages" className="no-underline">
              <Button variant="secondary">Open messages</Button>
            </Link>
          </div>
        }
      />
    </section>
  );
}
