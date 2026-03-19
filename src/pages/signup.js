import { Show, SignUp as ClerkSignUp } from '@clerk/react';
import { Navigate } from 'react-router-dom';

export function SignUp() {
  return (
    <Show when="signed-out" fallback={<Navigate to="/home" replace />}>
      <section className="flex justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-2 shadow-lg shadow-black/20 sm:p-4">
          <ClerkSignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            fallbackRedirectUrl="/home"
          />
        </div>
      </section>
    </Show>
  );
}
