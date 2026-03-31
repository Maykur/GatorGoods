import { Link } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../components/ui";

export function OffersPage() {
  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Offers"
        title="Offers inbox is coming soon"
        description="We’re keeping this route live in the new shell, but real offer workflow data is not ready yet. For now, messaging and listings remain the active buying flow."
      />
      <Card variant="subtle" className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">Why it exists</p>
          <p className="text-sm leading-7 text-app-soft">
            This route stays visible so the shell matches the intended product map, even before offer data is wired up.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">Current flow</p>
          <p className="text-sm leading-7 text-app-soft">
            Buyers and sellers should use listing pages plus direct messages for negotiation until structured offers are backed by real backend state.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">Next milestone</p>
          <p className="text-sm leading-7 text-app-soft">
            Once the offer model is ready, this screen becomes the inbox for offer review, response, and status tracking.
          </p>
        </div>
      </Card>
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
