import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div>
      <header className="app-header">
        <div className="app-brand">
          <Link to="/">
            GatorGoods
          </Link>
        </div>
        <nav className="app-nav">
          <Link to="/">
            Home
          </Link>
          <Link to="/create">
            Create Listing
          </Link>
          <Link to="/offers">
            Offers
          </Link>
          <Link to="/messages">
            Messages
          </Link>
          <Link to="/profile/demo">
            Profile
          </Link>
          <Link to="/login">
            Login
          </Link>
          <Link to="/signup">
            Sign Up
          </Link>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

