import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Show, UserButton, useUser } from '@clerk/react';
import { Button } from './ui';

const publicNavItems = [{ to: '/', label: 'Landing', end: true }];

function getNavLinkClass(isActive) {
  return [
    'rounded-full px-3 py-2 no-underline transition-colors duration-200',
    isActive
      ? 'bg-gatorOrange/15 text-white ring-1 ring-gatorOrange/35'
      : 'text-slate-300 hover:bg-white/5 hover:text-white',
  ].join(' ');
}

function BrandMark() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gatorOrange via-orange-500 to-brand-blue text-sm font-extrabold text-white shadow-glow">
      GG
    </span>
  );
}

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useUser();
  const location = useLocation();

  const signedInNavItems = user ? [
    { to: '/listings', label: 'Browse' },
    { to: '/messages', label: 'Messages' },
    { to: '/offers', label: 'Offers' },
    { to: '/profile/me', label: 'Profile' },
  ] : [];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-gatorDark text-gatorLight">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-app-bg/85 text-gatorLight backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3 no-underline"
          >
            <BrandMark />
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-gatorOrange">
                GatorGoods
              </p>
              <p className="hidden text-xs uppercase tracking-[0.18em] text-app-muted sm:block">
                Campus marketplace for UF students
              </p>
            </div>
          </Link>
          <button
            type="button"
            className="focus-ring ml-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gatorLight transition-colors hover:border-white/20 hover:bg-white/10 sm:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="primary-nav"
          >
            Menu
          </button>
          <nav id="primary-nav" className="ml-auto hidden items-center gap-2 text-sm sm:flex">
            {publicNavItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => getNavLinkClass(isActive)}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            <Show when="signed-in">
              {signedInNavItems.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => getNavLinkClass(isActive)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </Show>
            <Show when="signed-out">
              <Link to="/login" className="no-underline">
                <Button type="button" variant="secondary" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/signup" className="no-underline">
                <Button type="button" size="sm">
                  Sign up
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <Link to="/create" className="no-underline">
                <Button size="sm">Create listing</Button>
              </Link>
              <div className="rounded-full border border-white/10 bg-white/5 p-1">
                <UserButton afterSignOutUrl="/" />
              </div>
            </Show>
          </nav>
        </div>
        {isMenuOpen ? (
          <div className="sm:hidden">
            <button
              type="button"
              className="fixed inset-0 z-30 bg-app-bg/60 backdrop-blur-sm"
              aria-label="Close navigation menu"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute inset-x-4 top-full z-40 animate-fade-in-up rounded-[1.75rem] border border-white/10 bg-app-panel/95 p-4 shadow-card">
              <nav className="flex flex-col gap-2 text-sm">
                {publicNavItems.map(({ to, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => getNavLinkClass(isActive)}
                  >
                    {label}
                  </NavLink>
                ))}
                <Show when="signed-in">
                  {signedInNavItems.map(({ to, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) => getNavLinkClass(isActive)}
                    >
                      {label}
                    </NavLink>
                  ))}
                  <Link to="/create" className="mt-2 no-underline">
                    <Button fullWidth>Create listing</Button>
                  </Link>
                </Show>
                <Show when="signed-out">
                  <Link to="/login" className="no-underline">
                    <Button variant="secondary" fullWidth>
                      Log in
                    </Button>
                  </Link>
                  <Link to="/signup" className="no-underline">
                    <Button fullWidth>Sign up</Button>
                  </Link>
                </Show>
              </nav>
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 bg-slate-950/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-400 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="m-0 font-medium text-slate-200">GatorGoods</p>
            <p className="m-0 mt-1 text-app-muted">Built for UF students who want a calmer way to buy and sell.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="hover:text-white">Landing</Link>
            <Show when="signed-in">
              <Link to="/listings" className="hover:text-white">Browse</Link>
              <Link to="/create" className="hover:text-white">Create listing</Link>
              <Link to="/messages" className="hover:text-white">Messages</Link>
            </Show>
          </div>
        </div>
      </footer>
    </div>
  );
}
