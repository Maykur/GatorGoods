import { Show, SignIn } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';

export function LoginPage() {
  return (
    <Show when="signed-out" fallback={<Navigate to="/listings" replace />}>
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Card padding="lg" className="hidden min-h-[32rem] overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <PageHeader
            eyebrow="Welcome back"
            title="Sign in and get back to campus deals"
            description="Browse verified student listings, keep your messages in one place, and post new items without leaving the GatorGoods flow."
          />
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-gatorOrange">Why this route matters</p>
            <p className="mt-3 text-base leading-7 text-app-soft">
              We now treat the landing page as a product intro and `/listings` as the real signed-in marketplace. After sign in, you land where the action is.
            </p>
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
