import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <div style={{ fontWeight: 700 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            GatorGoods
          </Link>
        </div>
        <nav style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/create" style={{ textDecoration: 'none' }}>
            Create Listing
          </Link>
          <Link to="/offers" style={{ textDecoration: 'none' }}>
            Offers
          </Link>
          <Link to="/messages" style={{ textDecoration: 'none' }}>
            Messages
          </Link>
          <Link to="/profile/demo" style={{ textDecoration: 'none' }}>
            Profile
          </Link>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            Login
          </Link>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            Sign Up
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

