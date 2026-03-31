import { Link } from "react-router-dom";
import { Button, EmptyState, PageHeader } from "../components/ui";

export function OffersPage() {
  return (
    <section className="w-full space-y-8">
      <PageHeader
        eyebrow="Offers"
        title="Offers inbox is coming soon"
        description="We’re keeping this route live in the new shell, but real offer workflow data is not ready yet. For now, messaging and listings remain the active buying flow."
      />
      <EmptyState
        title="This surface is reserved for structured offers"
        description="When the backend offer model is ready, this page will become the place to review negotiations, respond to buyers, and track offer status without leaving the app."
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
