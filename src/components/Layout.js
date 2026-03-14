import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/create', label: 'Create Listing' },
  { to: '/offers', label: 'Offers' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile/demo', label: 'Profile' },
  { to: '/login', label: 'Login' },
  { to: '/signup', label: 'Sign Up' },
];

function getNavLinkClass(isActive) {
  return [
    'rounded-full px-3 py-2 no-underline transition-colors',
    isActive
      ? 'bg-gatorOrange text-white'
      : 'text-slate-300 hover:bg-white/5 hover:text-gatorOrange',
  ].join(' ');
}

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gatorDark text-gatorLight">
      <header className="border-b border-slate-800 bg-gatorBlue text-gatorLight shadow-sm shadow-black/20">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-gatorLight no-underline transition-colors hover:text-gatorOrange"
          >
            GatorGoods
          </Link>
          <button
            type="button"
            className="ml-auto rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-gatorLight transition-colors hover:border-gatorOrange hover:text-gatorOrange sm:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="primary-nav"
          >
            Menu
          </button>
          <nav
            id="primary-nav"
            className={[
              'w-full flex-col gap-2 text-sm sm:ml-auto sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2',
              isMenuOpen ? 'flex' : 'hidden',
            ].join(' ')}
          >
            {navItems.map(({ to, label, end }) => (
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
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 text-sm text-slate-400 sm:px-6">
          <p className="m-0 font-medium text-slate-300">GatorGoods</p>
          <p className="m-0">Built for UF students, {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
