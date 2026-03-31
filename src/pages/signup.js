import { Show, SignUp as ClerkSignUp } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';

export function SignUp() {
  return (
    <Show when="signed-out" fallback={<Navigate to="/listings" replace />}>
      <section className="mx-auto grid w-full max-w-6xl gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Card
          padding="lg"
          className="hidden min-h-[32rem] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,70,22,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,51,160,0.2),transparent_35%)] lg:flex lg:flex-col lg:justify-between"
        >
          <PageHeader
            eyebrow="Join the marketplace"
            title="Create your GatorGoods account"
            description="Set up your UF marketplace identity, list items faster, and keep every campus trade inside a consistent, student-first experience."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-gatorOrange">Built for campus trust</p>
              <p className="mt-3 text-base leading-7 text-app-soft">
                Create a student marketplace profile that makes it easier to share listings, coordinate pickup, and build buyer confidence.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-gatorOrange">What you unlock</p>
              <p className="mt-3 text-base leading-7 text-app-soft">
                Post items, track conversations, save favorites, and manage your campus selling activity from one account.
              </p>
            </div>
          </div>
        </Card>
        <Card padding="none" className="w-full overflow-hidden p-2 sm:p-4">
          <ClerkSignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            fallbackRedirectUrl="/listings"
          />
        </Card>
      </section>
    </Show>
  );
}
