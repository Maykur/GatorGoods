import { Show, SignIn } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';

export function LoginPage() {
  return (
    <Show when="signed-out" fallback={<Navigate to="/listings" replace />}>
      <section className="mx-auto grid w-full max-w-6xl gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Card
          padding="lg"
          className="hidden min-h-[32rem] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,70,22,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,51,160,0.2),transparent_35%)] lg:flex lg:flex-col lg:justify-between"
        >
          <PageHeader
            eyebrow="Welcome back"
            title="Sign in and get back to campus deals"
            description="Sign in to browse verified student listings, message people, and post your own items."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-gatorOrange">Campus marketplace</p>
              <p className="mt-3 text-base leading-7 text-app-soft">
                Jump back into active listings, current prices, and nearby pickup options.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-gatorOrange">Everything in one place</p>
              <p className="mt-3 text-base leading-7 text-app-soft">
                Your messages, saved items, and listing tools stay together so it is easy to pick up where you left off.
              </p>
            </div>
          </div>
        </Card>
        <Card padding="none" className="w-full overflow-hidden p-2 sm:p-4">
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/signup"
            fallbackRedirectUrl="/listings"
          />
        </Card>
      </section>
    </Show>
  );
}
