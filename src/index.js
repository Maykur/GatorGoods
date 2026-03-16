import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const clerkPublishableKey =
  typeof window !== 'undefined' ? window.CLERK_PUBLISHABLE_KEY : '';

const hasClerkPublishableKey =
  typeof clerkPublishableKey === 'string' &&
  clerkPublishableKey.length > 0 &&
  clerkPublishableKey !== '%REACT_APP_CLERK_PUBLISHABLE_KEY%' &&
  clerkPublishableKey !== 'your_publishable_key_here';

function MissingClerkKey() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gatorDark px-4 text-gatorLight">
      <section className="max-w-xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-lg shadow-black/20">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
          Clerk Setup Required
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Add your Clerk publishable key
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Set <code>REACT_APP_CLERK_PUBLISHABLE_KEY</code> in{' '}
          <code>.env.local</code> and restart the dev server.
        </p>
      </section>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {hasClerkPublishableKey ? (
      <ClerkProvider afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <MissingClerkKey />
    )}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
